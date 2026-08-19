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

    return WebhookResponse(
        status="ACCEPTED",
        message="Invoice successfully received and queued for ingestion.",
        filename=filename,
        file_path=target_path,
        size_bytes=file_size,
        source=source_tag or "webhook",
    )
