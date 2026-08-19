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
