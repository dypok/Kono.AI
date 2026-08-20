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

    def _classify_empresa_tipo(self, sender: str, subject: str, vendor_name: str | None = None) -> tuple[str, str]:
        """Classify email by empresa and tipo (Debito/Credito) for renta declaration according to US-REQ-005.

        Empresa: extracted from vendor_name or sender domain, sanitized for label.
        Tipo: Debito (default) vs Credito (if nota credito / credit note).
        """
        empresa = "General"
        if vendor_name and vendor_name.strip() and vendor_name != "Proveedor General":
            empresa = vendor_name.strip().split()[0]
        elif sender and "@" in sender:
            try:
                domain = sender.split("@")[-1].split(">")[0].strip().lower()
                empresa = domain.split(".")[0].capitalize() if domain else "General"
            except Exception:
                pass
        empresa = "".join(c if c.isalnum() else "_" for c in empresa)[:30] or "General"

        text_lower = f"{subject} {vendor_name or ''}".lower()
        if any(k in text_lower for k in ["nota credito", "nota crédito", "credit note", "credito"]):
            tipo = "Credito"
        else:
            tipo = "Debito"
        return empresa, tipo

    async def reset_and_rescan_invoices(
        self,
        access_token: str,
        user_id: str,
        label_name: str = "KONO_INVOICE",
    ) -> Dict[str, Any]:
        """
        Removes the 'KONO_INVOICE' label from all previously tagged messages in Gmail
        and re-triggers a fresh scan & extraction cycle into PostgreSQL.
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }
        cleared_count = 0
        async with httpx.AsyncClient(headers=headers, timeout=25.0) as client:
            try:
                # 1. Find the label ID
                label_id = None
                labels_res = await client.get(f"{GMAIL_API_BASE}/labels")
                if labels_res.status_code == 200:
                    labels = labels_res.json().get("labels", [])
                    for lbl in labels:
                        if lbl.get("name", "").upper() == label_name.upper():
                            label_id = lbl.get("id")
                            break

                # 2. Search all messages currently having this label
                if label_id:
                    msgs_res = await client.get(
                        f"{GMAIL_API_BASE}/messages",
                        params={"labelIds": label_id, "maxResults": 50},
                    )
                    if msgs_res.status_code == 200:
                        messages = msgs_res.json().get("messages", [])
                        for msg in messages:
                            m_id = msg.get("id")
                            # Remove the label from each message
                            await client.post(
                                f"{GMAIL_API_BASE}/messages/{m_id}/modify",
                                json={"removeLabelIds": [label_id]},
                            )
                            cleared_count += 1

                logger.info("Cleared %s label from %d messages for user %s", label_name, cleared_count, user_id)
            except Exception as err:
                logger.error("Error clearing Gmail label %s: %s", label_name, err)

        # 3. Immediately re-trigger full fresh scan & PostgreSQL ingestion
        scan_res = await self.scan_and_fetch_invoices(
            access_token=access_token,
            user_id=user_id,
            max_results=30,
        )
        scan_res["messages_untagged"] = cleared_count
        return scan_res

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

                    # Inspect parts recursively for attachments (handles nested multipart/mixed/related)
                    def extract_attachment_parts(part_node: dict) -> list:
                        found = []
                        if part_node.get("filename") and part_node.get("body", {}).get("attachmentId"):
                            found.append(part_node)
                        for child in part_node.get("parts", []):
                            found.extend(extract_attachment_parts(child))
                        return found

                    attachment_parts = extract_attachment_parts(payload)
                    has_attachment = False

                    for part in attachment_parts:
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

                                # ⚡ Deterministic Extraction & Strict Invoice Validation
                                try:
                                    from app.services.pdf_extractor_service import pdf_extractor_service
                                    from app.core.database import AsyncSessionLocal
                                    from app.models.document import Document, InvoiceItem, Discrepancy
                                    import uuid

                                    extracted = pdf_extractor_service.extract_document(file_path)
                                    doc_type = extracted.get("document_type", "INVOICE")
                                    is_other = doc_type == "OTHER"

                                    # 🛑 FILTRO ESTRICTO: Si NO es factura/recibo (ej. contratos, manuales, fotos, documentos varios), descartar inmediatamente
                                    if is_other:
                                        logger.info("Discarding non-invoice attachment from Gmail: %s (Type: OTHER, Score: %s)", filename, extracted.get("classifier_score"))
                                        if os.path.exists(file_path):
                                            try:
                                                os.remove(file_path)
                                            except Exception:
                                                pass
                                        continue

                                    doc_id = str(uuid.uuid4())
                                    has_attachment = True
                                    results["invoices_found"] += 1

                                    # 🏷️ Clasificación Jerárquica Empresa → Tipo (Débito/Crédito) según US-REQ-005
                                    empresa, tipo = self._classify_empresa_tipo(sender, subject, extracted.get("vendor_name"))
                                    hierarchical_label = f"KONO_INVOICE/{empresa}/{tipo}"
                                    label_id = await self.get_or_create_label(client, hierarchical_label)

                                    if AsyncSessionLocal is not None:
                                        async with AsyncSessionLocal() as db:
                                            # Check if file hash already exists to prevent duplicates
                                            existing = None
                                            file_hash = extracted.get("file_hash_sha256")
                                            if file_hash:
                                                from sqlalchemy import select
                                                stmt = select(Document).where(Document.file_hash_sha256 == file_hash)
                                                existing = (await db.execute(stmt)).scalars().first()

                                            if not existing:
                                                doc_obj = Document(
                                                    id=doc_id,
                                                    user_id=user_id or "b1a74a90-f715-4432-8e94-1a4dd43964dc",
                                                    file_name=filename,
                                                    file_path=file_path,
                                                    file_hash_sha256=file_hash,
                                                    mime_type="application/pdf" if filename.lower().endswith(".pdf") else "image/png",
                                                    file_size_bytes=len(file_bytes),
                                                    invoice_number=extracted.get("invoice_number"),
                                                    vendor_name=extracted.get("vendor_name"),
                                                    vendor_tax_id=extracted.get("vendor_tax_id"),
                                                    issue_date=extracted.get("issue_date"),
                                                    currency=extracted.get("currency", "COP"),
                                                    subtotal=extracted.get("subtotal") or 0.0,
                                                    tax_total=extracted.get("tax_total") or 0.0,
                                                    withholding_total=extracted.get("withholding_total") or 0.0,
                                                    grand_total=extracted.get("grand_total") or 0.0,
                                                    processing_status="AUDITED" if extracted.get("kono_state") == "GREEN" else "PENDING",
                                                    kono_state=extracted.get("kono_state", "GREEN"),
                                                    document_type=doc_type,
                                                    classifier_score=extracted.get("classifier_score"),
                                                    extraction_method="DETERMINISTIC",
                                                    bounding_boxes={**extracted.get("bounding_boxes", {}), "gmail_label": hierarchical_label},
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
                                                logger.info("Successfully ingested genuine Gmail invoice into PostgreSQL: %s (Doc ID: %s, Label: %s)", filename, doc_id, hierarchical_label)
                                except Exception as db_err:
                                    logger.error("Error saving Gmail invoice to database: %s", db_err)

                                results["files_extracted"].append({
                                    "filename": safe_filename,
                                    "file_path": file_path,
                                    "subject": subject,
                                    "sender": sender,
                                    "label": hierarchical_label,
                                    "empresa": empresa,
                                    "tipo": tipo,
                                })

                                # 3. Apply hierarchical label in Gmail
                                if label_id:
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
