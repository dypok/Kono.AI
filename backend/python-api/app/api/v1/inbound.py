import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException, Request, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.document import Document
from app.models.vendor import VendorTemplate
from app.schemas.document import ActionResponse

logger = logging.getLogger("kono.api.inbound")

router = APIRouter(prefix="/inbound", tags=["inbound"])

# Allowed MIME types for inbound documents (matches the triage whitelist).
ALLOWED_MIME = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
}

# Header name the n8n workflow (US-INT-001) sends for authentication.
WEBHOOK_SECRET_HEADER = "X-Kono-Webhook-Secret"


@router.post("/webhook", response_model=ActionResponse, status_code=201)
async def receive_inbound_webhook(
    request: Request,
    file: UploadFile = File(...),
    source_tag: str = "external",
    x_kono_webhook_secret: str = Header(default="", alias=WEBHOOK_SECRET_HEADER),
    db: AsyncSession = Depends(get_db),
):
    """Receives an invoice file from n8n (or any external source) and routes it
    into the Kono.ai pipeline.

    - Auth: validates X-Kono-Webhook-Secret against the configured secret.
    - MIME: only pdf/png/jpg/jpeg.
    - Size: bounded (MAX_INBOUND_BYTES) to avoid unbounded writes.
    - Persists the original file into STORAGE_DIR/inbound and registers a
      Document with status PENDING for the pipeline (watcher/triage).
    """
    settings = get_settings()

    # 1. Authenticate the caller.
    if not _safe_equal(x_kono_webhook_secret, settings.webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid or missing webhook secret")

    # 2. Validate MIME type.
    mime = file.content_type or "application/octet-stream"
    ext = ALLOWED_MIME.get(mime)
    if ext is None:
        raise HTTPException(status_code=415, detail=f"Unsupported MIME type: {mime}")

    # 3. Read with a size guard.
    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > settings.max_inbound_bytes:
        raise HTTPException(status_code=413, detail="File too large")

    # 4. Persist original into the inbound folder (watcher picks it up) and
    #    register a Document row so the API can list/query it immediately.
    inbound_dir = Path(settings.storage_dir) / "inbound"
    inbound_dir.mkdir(parents=True, exist_ok=True)
    doc_id = str(uuid.uuid4())
    target_path = inbound_dir / f"{doc_id}.{ext}"
    with open(target_path, "wb") as fh:
        fh.write(raw)

    doc = Document(
        id=doc_id,
        file_name=file.filename or target_path.name,
        file_path=str(target_path),
        file_hash_sha256=None,  # filled by the hasher/triage step
        mime_type=mime,
        file_size_bytes=len(raw),
        processing_status="PENDING",
        kono_state="YELLOW",
        extraction_method="DETERMINISTIC",
        bounding_boxes={"source_tag": source_tag, "origin": "n8n_webhook"},
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # 5. Notify the WebSocket feed (if connected) that a new doc arrived.
    try:
        manager = getattr(request.app.state, "ws_manager", None)
        if manager is not None:
            await manager.broadcast(
                {
                    "type": "DOCUMENT_PROCESSED",
                    "document_id": doc_id,
                    "kono_state": "PENDING",
                    "source": "inbound_webhook",
                }
            )
    except Exception as exc:  # noqa: BLE001 - WS is best effort, never fail the webhook
        logger.warning("ws broadcast failed for inbound doc %s: %s", doc_id, exc)

    return ActionResponse(
        id=doc_id,
        processing_status="PENDING",
        kono_state="YELLOW",
        message="Invoice received and queued for processing",
    )


# -------------------------------------------------------------------------- #
# Inbound metadata (optional convenience)
# -------------------------------------------------------------------------- #
@router.get("/ping")
async def inbound_ping():
    return {"status": "ok", "service": "kono-inbound"}


def _safe_equal(a: str, b: str) -> bool:
    """Constant-time-ish comparison for the webhook secret."""
    import hmac

    return hmac.compare_digest(a.encode(), b.encode())
