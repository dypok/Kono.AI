import os
import logging
import base64
import httpx
import aiofiles
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("kono.gmail_oauth")

STORAGE_INBOUND_DIR = os.getenv("STORAGE_INBOUND_DIR", "/data/storage/inbound")
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

class GmailOAuthService:
    """
    Service for interacting directly with Google Gmail REST API using OAuth 2.0 Access Tokens.
    """

    async def get_or_create_label(self, client: httpx.AsyncClient, label_name: str = "KONO_INVOICE") -> Optional[str]:
        """Gets existing label ID or creates a new label in user's Gmail."""
        try:
            # 1. List labels
            res = await client.get(f"{GMAIL_API_BASE}/labels")
            if res.status_code == 200:
                labels = res.json().get("labels", [])
                for lbl in labels:
                    if lbl.get("name", "").upper() == label_name.upper():
                        return lbl.get("id")

            # 2. Create label if not found
            create_res = await client.post(
                f"{GMAIL_API_BASE}/labels",
                json={
                    "name": label_name,
                    "labelListVisibility": "labelShow",
                    "messageListVisibility": "show",
                },
            )
            if create_res.status_code == 200:
                return create_res.json().get("id")
        except Exception as e:
            logger.warning("Could not create/fetch label %s in Gmail: %s", label_name, e)
        return None

    async def scan_and_fetch_invoices(
        self,
        access_token: str,
        user_id: str,
        query: str = "has:attachment (filename:pdf OR filename:png OR filename:jpg OR subject:factura OR subject:invoice)",
        max_results: int = 25,
    ) -> Dict[str, Any]:
        """
        Queries Gmail API for invoice emails, downloads attachments to /data/storage/inbound/,
        and applies the 'KONO_INVOICE' label.
        """
        results = {
            "user_id": user_id,
            "emails_scanned": 0,
            "invoices_found": 0,
            "files_extracted": [],
            "status": "COMPLETED",
            "synced_at": datetime.utcnow().isoformat(),
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(headers=headers, timeout=20.0) as client:
            try:
                # 1. Search messages matching query
                list_res = await client.get(
                    f"{GMAIL_API_BASE}/messages",
                    params={"q": query, "maxResults": max_results},
                )

                if list_res.status_code != 200:
                    results["status"] = "ERROR"
                    results["error_message"] = f"Gmail API returned {list_res.status_code}: {list_res.text}"
                    return results

                messages = list_res.json().get("messages", [])
                results["emails_scanned"] = len(messages)

                if not messages:
                    return results

                # 2. Ensure KONO_INVOICE label exists
                label_id = await self.get_or_create_label(client, "KONO_INVOICE")

                os.makedirs(STORAGE_INBOUND_DIR, exist_ok=True)

                for msg_meta in messages:
                    msg_id = msg_meta.get("id")
                    msg_res = await client.get(f"{GMAIL_API_BASE}/messages/{msg_id}")
                    if msg_res.status_code != 200:
                        continue

                    msg_data = msg_res.json()
                    payload = msg_data.get("payload", {})
                    headers_list = payload.get("headers", [])
                    subject = next((h["value"] for h in headers_list if h["name"].lower() == "subject"), "")
                    sender = next((h["value"] for h in headers_list if h["name"].lower() == "from"), "")

                    # Inspect parts for attachments
                    parts = payload.get("parts", [payload])
                    has_attachment = False

                    for part in parts:
                        filename = part.get("filename")
                        body = part.get("body", {})
                        attachment_id = body.get("attachmentId")

                        if filename and attachment_id:
                            # Fetch binary attachment data
                            att_res = await client.get(
                                f"{GMAIL_API_BASE}/messages/{msg_id}/attachments/{attachment_id}"
                            )
                            if att_res.status_code == 200:
                                raw_base64 = att_res.json().get("data", "")
                                file_bytes = base64.urlsafe_b64decode(raw_base64.encode("UTF-8"))

                                safe_filename = f"gmail_oauth_{int(datetime.utcnow().timestamp())}_{filename}"
                                file_path = os.path.join(STORAGE_INBOUND_DIR, safe_filename)

                                async with aiofiles.open(file_path, "wb") as f:
                                    await f.write(file_bytes)

                                has_attachment = True
                                results["invoices_found"] += 1
                                results["files_extracted"].append({
                                    "filename": safe_filename,
                                    "file_path": file_path,
                                    "subject": subject,
                                    "sender": sender,
                                    "label": "KONO_INVOICE",
                                })

                    # 3. Apply KONO_INVOICE label
                    if has_attachment and label_id:
                        await client.post(
                            f"{GMAIL_API_BASE}/messages/{msg_id}/modify",
                            json={"addLabelIds": [label_id]},
                        )

            except Exception as e:
                logger.error("Error during Gmail OAuth scanning: %s", str(e))
                results["status"] = "ERROR"
                results["error_message"] = str(e)

        return results

gmail_oauth_service = GmailOAuthService()
