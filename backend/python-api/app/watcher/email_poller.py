import asyncio
import email
import logging
import uuid
from email.message import Message
from pathlib import Path
from typing import List, Optional, Tuple

from app.core.config import get_settings

logger = logging.getLogger("kono.inbound.email")

# MIME subtypes we accept as invoice attachments.
ATTACHMENT_SUBTYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
}


class DeferredEmailPoller:
    """Polling IMAP inbox for invoice attachments (Gmail / any IMAP).

    The class is divided so tests can exercise **pure logic** (parsing MIME
    messages into attachment specs) without needing a live IMAP server, and
    the connection layer (`aioimaplib`) can be mocked.
    """

    def __init__(self, settings=None) -> None:
        self.settings = settings or get_settings()

    # ------------------------------------------------------------------ #
    # Pure helpers (no I/O) - unit-testable
    # ------------------------------------------------------------------ #
    @staticmethod
    def is_attachment_supported(part: Message) -> bool:
        ctype = part.get_content_type()  # e.g. "application/pdf"
        return ctype in ATTACHMENT_SUBTYPES

    @staticmethod
    def extract_metadata(msg: Message) -> dict:
        """Extracts sender (From), subject and received date."""
        from_ = msg.get("From", "") or ""
        subject = msg.get("Subject", "") or ""
        date = msg.get("Date", "") or ""
        return {"from": from_, "subject": subject, "received_at": date}

    def extract_attachments(self, msg: Message) -> List[Tuple[str, bytes, str]]:
        """Returns [(filename, bytes, mime)] of supported attachments in a MIME
        message (handles both simple and multipart)."""
        parts: List[Message] = []
        if msg.is_multipart():
            parts.extend(p for p in msg.walk())
        else:
            parts.append(msg)
        results: List[Tuple[str, bytes, str]] = []
        for part in parts:
            if part.get_content_disposition() == "attachment" and self.is_attachment_supported(part):
                filename = part.get_filename() or f"attachment-{uuid.uuid4().hex}.bin"
                payload = part.get_payload(decode=True)
                if payload:
                    results.append((filename, payload, part.get_content_type()))
        return results

    # ------------------------------------------------------------------ #
    # Persist + register (reuses the same Document contract as the webhook)
    # ------------------------------------------------------------------ #
    async def persist_and_register(
        self, filename: str, data: bytes, mime: str, metadata: dict
    ) -> str:
        from app.core.database import AsyncSessionLocal
        from app.models.document import Document

        ext = self._ext_from_mime(mime)
        inbound_dir = Path(self.settings.storage_dir) / "inbound"
        inbound_dir.mkdir(parents=True, exist_ok=True)
        doc_id = str(uuid.uuid4())
        target = inbound_dir / f"{doc_id}.{ext}"
        with open(target, "wb") as fh:
            fh.write(data)

        # Reuse a session directly (out of FastAPI request scope).
        if AsyncSessionLocal is None:
            from app.core.database import init_engine

            init_engine()

        async with AsyncSessionLocal() as session:
            doc = Document(
                id=doc_id,
                file_name=filename,
                file_path=str(target),
                mime_type=mime,
                file_size_bytes=len(data),
                processing_status="PENDING",
                kono_state="YELLOW",
                bounding_boxes={"email_metadata": metadata},
            )
            session.add(doc)
            await session.commit()
        return doc_id

    @staticmethod
    def _ext_from_mime(mime: str) -> str:
        return {
            "application/pdf": "pdf",
            "image/png": "png",
            "image/jpeg": "jpg",
        }.get(mime, "bin")

    # ------------------------------------------------------------------ #
    # IMAP polling loop (async; uses aioimaplib; server is dependency-injected)
    # ------------------------------------------------------------------ #
    async def run(
        self,
        imap_client_factory=None,
        on_message=None,
        mark_processed: bool = True,
    ) -> None:
        """Poll the inbox until cancelled.

        `imap_client_factory` lets tests inject a fake async IMAP client.
        `on_message` overrides the per-message handler (for tests).
        """
        handler = on_message or self._process_imap_message

        while True:
            try:
                client = await self._connect()
                await self._poll_once(client, handler, mark_processed)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001
                logger.warning("email poll cycle error: %s", exc)
            finally:
                try:
                    await client.logout()
                except Exception:  # noqa: BLE001
                    pass
            await asyncio.sleep(self.settings.imap_poll_interval_sec)

    async def _connect(self):
        import aioimaplib

        client = aioimaplib.IMAP4_SSL(
            self.settings.imap_host, self.settings.imap_port
        )
        await client.wait_hello_from_server()
        await client.login(self.settings.imap_user, self.settings.imap_password)
        await client.select("INBOX")
        return client

    async def _poll_once(self, client, handler, mark_processed: bool) -> None:
        import aioimaplib

        status, data = await client.search("UNSEEN")
        if status != "OK":
            return
        ids = self._parse_search_ids(data)
        for msg_id in ids:
            _, msg_data = await client.fetch(
                msg_id, "(RFC822)"
            )
            if not msg_data:
                continue
            raw = self._first_rfc822(msg_data)
            if raw is None:
                continue
            msg = email.message_from_bytes(raw)
            success = await handler(client, msg)
            if success and mark_processed:
                # Mark as read/seen so it isn't reprocessed.
                try:
                    await client.store(msg_id, "+FLAGS", "\\Seen")
                except Exception as exc:  # noqa: BLE001
                    logger.warning("could not mark msg %s: %s", msg_id, exc)

    async def _process_imap_message(self, client, msg: Message) -> bool:
        metadata = self.extract_metadata(msg)
        attachments = self.extract_attachments(msg)
        if not attachments:
            return False
        processed = 0
        for filename, data, mime in attachments:
            try:
                await self.persist_and_register(filename, data, mime, metadata)
                processed += 1
            except Exception as exc:  # noqa: BLE001
                logger.error("failed to ingest %s: %s", filename, exc)
        return processed > 0

    @staticmethod
    def _parse_search_ids(data) -> List[str]:
        if not data:
            return []
        first = data[0]
        if isinstance(first, (list, tuple)):
            first = first[0] if first else b""
        if isinstance(first, bytes):
            first = first.decode()
        return [i for i in str(first).split() if i.isdigit()]

    @staticmethod
    def _first_rfc822(msg_data) -> Optional[bytes]:
        for item in msg_data:
            if isinstance(item, tuple) and len(item) >= 2:
                return bytes(item[1])
        return None
