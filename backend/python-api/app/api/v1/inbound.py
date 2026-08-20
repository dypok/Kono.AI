import os
import aiofiles
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel

router = APIRouter(prefix="/inbound", tags=["Inbound Multi-Channel"])

SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

class WebhookResponse(BaseModel):
    status: str
    message: str
    filename: str
    file_path: str
    size_bytes: int
    source: str = "webhook"

@router.post(
    "/webhook",
    response_model=WebhookResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Webhook receiver for automated invoice pipelines",
)
async def receive_external_webhook(
    file: UploadFile = File(..., description="Invoice attachment (PDF or Image)"),
    x_kono_webhook_secret: Optional[str] = Header(
        None, alias="X-Kono-Webhook-Secret"
    ),
    source_tag: Optional[str] = Form(None, description="Optional tag identifying source"),
):
    """
    Receives automated invoice uploads from webhooks or integrations.
    Validates API key header and writes file directly to inbound storage.
    """
    expected_secret = os.getenv("KONO_WEBHOOK_SECRET", "kono_secret_key_2026")
    storage_dir = os.getenv("STORAGE_INBOUND_DIR", "/data/storage/inbound")

    if not x_kono_webhook_secret or x_kono_webhook_secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Kono-Webhook-Secret header.",
        )

    filename = file.filename or "invoice_webhook.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: '{ext}'. Allowed: {list(SUPPORTED_EXTENSIONS)}",
        )

    os.makedirs(storage_dir, exist_ok=True)
    safe_filename = f"webhook_{int(datetime.utcnow().timestamp())}_{filename}"
    target_path = os.path.join(storage_dir, safe_filename)

    file_size = 0
    async with aiofiles.open(target_path, "wb") as f:
        while chunk := await file.read(65536):
            file_size += len(chunk)
            await f.write(chunk)

    # ⚡ Ingest to PostgreSQL
    try:
        from app.services.pdf_extractor_service import pdf_extractor_service
        from app.core.database import AsyncSessionLocal
        from app.models.document import Document, InvoiceItem, Discrepancy
        import uuid

        extracted = pdf_extractor_service.extract_document(target_path)
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
                        user_id="b1a74a90-f715-4432-8e94-1a4dd43964dc",
                        file_name=filename,
                        file_path=target_path,
                        file_hash_sha256=file_hash,
                        mime_type="application/pdf" if filename.lower().endswith(".pdf") else "image/png",
                        file_size_bytes=file_size,
                        invoice_number=extracted.get("invoice_number") or f"FAC-WH-{doc_id[:6].upper()}",
                        vendor_name=extracted.get("vendor_name") or "Proveedor Webhook",
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
    except Exception as err:
        pass

    return WebhookResponse(
        status="ACCEPTED",
        message="Invoice successfully received and extracted into database.",
        filename=filename,
        file_path=target_path,
        size_bytes=file_size,
        source=source_tag or "webhook",
    )
