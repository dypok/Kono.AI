import os
import email
import imaplib
import logging
import aiofiles
from email.header import decode_header
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("kono.gmail_sync")

STORAGE_INBOUND_DIR = os.getenv("STORAGE_INBOUND_DIR", "/data/storage/inbound")
SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

class GmailSyncService:
    """
    Native Gmail/IMAP synchronization service without third-party tools (no n8n).
    Scans user inboxes, extracts invoice attachments, and applies 'KONO_INVOICE' label.
    """

    def __init__(self, host: str = "imap.gmail.com", port: int = 993):
        self.host = host
        self.port = port

    def _decode_str(self, header_value: Optional[str]) -> str:
        if not header_value:
            return ""
        decoded_parts = decode_header(header_value)
        text = ""
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                text += part.decode(encoding or "utf-8", errors="ignore")
            else:
                text += str(part)
        return text

    def _is_invoice_subject(self, subject: str) -> bool:
        keywords = ["factura", "invoice", "recibo", "cuenta de cobro", "comprobante", "billing", "electronic invoice", "dian"]
        sub_lower = subject.lower()
        return any(k in sub_lower for k in keywords)

    async def scan_and_sync_inbox(
        self,
        email_user: str,
        password: str,
        user_id: str,
        scan_all: bool = False,
    ) -> Dict[str, Any]:
        """
        Connects to user's Gmail/IMAP, searches for invoice emails, extracts attachments,
        applies the 'KONO_INVOICE' label, and deposits files into /data/storage/inbound/.
        """
        results = {
            "user_id": user_id,
            "account_email": email_user,
            "emails_scanned": 0,
            "invoices_found": 0,
            "files_extracted": [],
            "status": "COMPLETED",
            "synced_at": datetime.utcnow().isoformat(),
        }

        # Mock / Simulation mode if test credentials or demo session
        if not password or password == "••••••••••••" or "demo" in password:
            logger.info("Running simulated Gmail sync for %s (Demo session)", email_user)
            # Create a mock invoice in inbound
            os.makedirs(STORAGE_INBOUND_DIR, exist_ok=True)
            mock_filename = f"gmail_{int(datetime.utcnow().timestamp())}_INV_DEMO_{email_user.split('@')[0]}.pdf"
            mock_target = os.path.join(STORAGE_INBOUND_DIR, mock_filename)
            async with aiofiles.open(mock_target, "wb") as f:
                await f.write(b"%PDF-1.4 Kono Demo Automated Invoice Attachment")

            results["emails_scanned"] = 12
            results["invoices_found"] = 1
            results["files_extracted"].append({
                "filename": mock_filename,
                "file_path": mock_target,
                "subject": "Factura de Servicios Cloud #8891",
                "sender": "billing@cloudprovider.com",
                "label": "KONO_INVOICE"
            })
            return results

        # Real IMAP SSL connection
        try:
            mail = imaplib.IMAP4_SSL(self.host, self.port)
            mail.login(email_user, password)
            mail.select("INBOX")

            # Search for unread or all messages
            search_criterion = "ALL" if scan_all else "UNSEEN"
            status, messages = mail.search(None, search_criterion)
            if status != "OK":
                mail.logout()
                return results

            msg_ids = messages[0].split()
            results["emails_scanned"] = len(msg_ids)
            os.makedirs(STORAGE_INBOUND_DIR, exist_ok=True)

            for msg_id in msg_ids[-30:]:  # Scan the last 30 relevant emails
                res, data = mail.fetch(msg_id, "(RFC822)")
                if res != "OK":
                    continue

                raw_email = data[0][1]
                msg = email.message_from_bytes(raw_email)
                subject = self._decode_str(msg.get("Subject", ""))
                sender = self._decode_str(msg.get("From", ""))

                # Check if email is an invoice or has invoice attachment
                has_invoice_attachment = False
                extracted_for_msg = []

                for part in msg.walk():
                    content_disposition = str(part.get("Content-Disposition", ""))
                    if "attachment" in content_disposition:
                        filename = part.get_filename()
                        if filename:
                            decoded_filename = self._decode_str(filename)
                            ext = os.path.splitext(decoded_filename)[1].lower()
                            if ext in SUPPORTED_EXTENSIONS or self._is_invoice_subject(subject):
                                has_invoice_attachment = True
                                payload = part.get_payload(decode=True)
                                if payload:
                                    safe_name = f"gmail_{int(datetime.utcnow().timestamp())}_{decoded_filename}"
                                    file_path = os.path.join(STORAGE_INBOUND_DIR, safe_name)
                                    async with aiofiles.open(file_path, "wb") as f:
                                        await f.write(payload)

                                    # ⚡ Ingest to PostgreSQL
                                    try:
                                        from app.services.pdf_extractor_service import pdf_extractor_service
                                        from app.core.database import AsyncSessionLocal
                                        from app.models.document import Document, InvoiceItem, Discrepancy
                                        import uuid

                                        extracted = pdf_extractor_service.extract_document(file_path)
                                        doc_id = str(uuid.uuid4())

                                        if AsyncSessionLocal is not None:
                                            async with AsyncSessionLocal() as db:
                                                file_hash = extracted.get("file_hash_sha256")
                                                existing = None
                                                if file_hash:
                                                    from sqlalchemy import select
                                                    stmt = select(Document).where(Document.file_hash_sha256 == file_hash)
                                                    existing = (await db.execute(stmt)).scalars().first()

                                                if not existing:
                                                    doc_obj = Document(
                                                        id=doc_id,
                                                        user_id=user_id or "b1a74a90-f715-4432-8e94-1a4dd43964dc",
                                                        file_name=decoded_filename,
                                                        file_path=file_path,
                                                        file_hash_sha256=file_hash,
                                                        mime_type="application/pdf" if decoded_filename.lower().endswith(".pdf") else "image/png",
                                                        file_size_bytes=len(payload),
                                                        invoice_number=extracted.get("invoice_number") or f"FAC-IMAP-{doc_id[:6].upper()}",
                                                        vendor_name=extracted.get("vendor_name") or (sender.split("<")[0].strip() if sender else "Proveedor Email"),
                                                        vendor_tax_id=extracted.get("vendor_tax_id") or "NIT-PENDIENTE",
                                                        issue_date=extracted.get("issue_date") or datetime.utcnow().strftime("%d/%m/%Y"),
                                                        currency=extracted.get("currency", "COP"),
                                                        subtotal=extracted.get("subtotal") or 0.0,
                                                        tax_total=extracted.get("tax_total") or 0.0,
                                                        withholding_total=extracted.get("withholding_total") or 0.0,
                                                        grand_total=extracted.get("grand_total") or 0.0,
                                                        processing_status="AUDITED" if extracted.get("kono_state") == "GREEN" else "PENDING",
                                                        kono_state=extracted.get("kono_state", "GREEN"),
                                                        extraction_method="DETERMINISTIC",
                                                        bounding_boxes=extracted.get("bounding_boxes"),
                                                    )
                                                    db.add(doc_obj)

                                                    for it in extracted.get("items", []):
                                                        db.add(InvoiceItem(
                                                            document_id=doc_id,
                                                            line_number=it.get("line_number", 1),
                                                            description=it.get("description", "Ítem Facturado"),
                                                            quantity=it.get("quantity", 1.0),
                                                            unit_price=it.get("unit_price", 0.0),
                                                            total_price=it.get("total_price", 0.0),
                                                            is_math_valid=it.get("is_math_valid", True),
                                                        ))

                                                    for disc in extracted.get("discrepancies", []):
                                                        db.add(Discrepancy(
                                                            document_id=doc_id,
                                                            field_name=disc.get("field_name", ""),
                                                            alert_type=disc.get("alert_type", "WARNING"),
                                                            description=disc.get("description", ""),
                                                        ))

                                                    await db.commit()
                                                    logger.info("Successfully ingested IMAP invoice into PostgreSQL: %s (Doc ID: %s)", decoded_filename, doc_id)
                                    except Exception as db_err:
                                        logger.error("Error saving IMAP invoice to database: %s", db_err)

                                    extracted_for_msg.append({
                                        "filename": safe_name,
                                        "file_path": file_path,
                                        "subject": subject,
                                        "sender": sender,
                                        "label": "KONO_INVOICE",
                                    })

                if has_invoice_attachment or self._is_invoice_subject(subject):
                    results["invoices_found"] += len(extracted_for_msg)
                    results["files_extracted"].extend(extracted_for_msg)
                    
                    # 🏷️ Apply Gmail label / flags
                    try:
                        # Add KONO_INVOICE label (supported by Gmail IMAP via X-GM-LABELS or STORE)
                        mail.store(msg_id, "+FLAGS", "(\\Seen)")
                        mail.store(msg_id, "+X-GM-LABELS", "KONO_INVOICE")
                    except Exception as label_err:
                        logger.warning("Could not apply Gmail X-GM-LABELS (non-Gmail IMAP?): %s", label_err)

            mail.close()
            mail.logout()

        except Exception as e:
            logger.error("Error during Gmail inbox sync: %s", str(e))
            results["status"] = "ERROR"
            results["error_message"] = str(e)

        return results

gmail_sync_service = GmailSyncService()
