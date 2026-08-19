import csv
import io
import logging
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.database import get_db, get_sync_engine
from app.models.document import AuditLog, Discrepancy, Document, InvoiceItem
from app.models.vendor import VendorTemplate
from app.schemas.document import (
    ActionResponse,
    DocumentCorrection,
    DocumentDetail,
    DocumentListItem,
)
from app.api.v1.websockets import ConnectionManager

logger = logging.getLogger("kono.api.documents")

router = APIRouter(prefix="/documents", tags=["documents"])

# Allowed MIME types for direct upload (US-PY-003).
ALLOWED_MIME = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
}

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB hard cap (defensive, no unbounded writes)


def _get_manager(request: Request) -> ConnectionManager:
    manager = getattr(request.app.state, "ws_manager", None)
    if manager is None:
        manager = ConnectionManager()
        request.app.state.ws_manager = manager
    return manager


from app.core.supabase_auth import get_current_user, SupabaseUser

# -------------------------------------------------------------------------- #
# POST /api/v1/documents/upload
# -------------------------------------------------------------------------- #
@router.post("/upload", status_code=201, response_model=ActionResponse)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Uploads a PDF/image, validates MIME, persists the original file and
    registers the document with status PENDING (it will be triaged by the
    pipeline and later notified via WebSocket)."""
    mime = file.content_type or "application/octet-stream"
    ext = ALLOWED_MIME.get(mime)
    if ext is None:
        raise HTTPException(status_code=415, detail=f"Unsupported MIME type: {mime}")

    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (>15MB)")

    settings = get_settings()
    inbound_dir = Path(settings.storage_dir) / "inbound"
    inbound_dir.mkdir(parents=True, exist_ok=True)

    doc_id = str(uuid.uuid4())
    target_name = f"{doc_id}.{ext}"
    target_path = inbound_dir / target_name
    with open(target_path, "wb") as fh:
        fh.write(raw)

    doc = Document(
        id=doc_id,
        user_id=current_user.id,
        file_name=file.filename or target_name,
        file_path=str(target_path),
        file_hash_sha256=None,  # filled later by the hasher/triage step
        mime_type=mime,
        file_size_bytes=len(raw),
        processing_status="PENDING",
        kono_state="YELLOW",  # not yet audited -> pending review
        extraction_method="DETERMINISTIC",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Notify connected clients of a new document entering the pipeline.
    await _get_manager(request).broadcast(
        {"type": "DOCUMENT_PROCESSED", "document_id": doc_id, "kono_state": "PENDING", "user_id": current_user.id}
    )

    return ActionResponse(
        id=doc_id,
        kono_state="YELLOW",
        processing_status="PENDING",
        message="Document uploaded and queued for triage",
    )


# -------------------------------------------------------------------------- #
# GET /api/v1/documents/  (paginated list with filters and counts)
# -------------------------------------------------------------------------- #
@router.get("/", response_model=dict)
async def list_documents(
    kono_state: Optional[str] = Query(None, pattern="^(GREEN|YELLOW|RED)$"),
    q: Optional[str] = Query(None, description="Search in invoice number / vendor name / NIT"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Filter documents by authenticated user_id
    base_stmt = select(Document).where(
        (Document.user_id == current_user.id) | (Document.user_id.is_(None))
    )

    # Calculate real-time counts by kono_state for the active user
    all_user_docs = (await db.execute(base_stmt)).scalars().all()
    count_all = len(all_user_docs)
    count_green = sum(1 for d in all_user_docs if d.kono_state == "GREEN")
    count_yellow = sum(1 for d in all_user_docs if d.kono_state == "YELLOW")
    count_red = sum(1 for d in all_user_docs if d.kono_state == "RED")

    stmt = base_stmt.order_by(Document.created_at.desc())
    if kono_state:
        stmt = stmt.where(Document.kono_state == kono_state.upper())
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (Document.invoice_number.like(like))
            | (Document.file_name.like(like))
            | (Document.vendor_name.like(like))
            | (Document.vendor_tax_id.like(like))
        )

    filtered_docs = (await db.execute(stmt)).scalars().all()
    total = len(filtered_docs)
    
    # Paginate
    paged_docs = (await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))).scalars().all()

    return {
        "items": [DocumentListItem.model_validate(d) for d in paged_docs],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        "counts": {
            "all": count_all,
            "green": count_green,
            "yellow": count_yellow,
            "red": count_red,
        },
    }


# -------------------------------------------------------------------------- #
# GET /api/v1/documents/export?format=csv|json
# (declared before /{document_id} so the literal path wins over the param one)
# -------------------------------------------------------------------------- #
@router.get("/export")
async def export_documents(
    format: str = Query("csv", pattern="^(csv|json)$"),
    kono_state: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).order_by(Document.created_at.asc())
    if kono_state:
        stmt = stmt.where(Document.kono_state == kono_state.upper())
    rows = (await db.execute(stmt)).scalars().unique().all()

    columns = [
        "id", "invoice_number", "issue_date", "currency", "subtotal",
        "tax_total", "withholding_total", "grand_total", "kono_state",
        "processing_status", "extraction_method", "created_at",
    ]

    if format == "json":
        payload = [
            {c: getattr(d, c, None) for c in columns}
            for d in rows
        ]
        # Return the plain dict list: FastAPI will serialize it as proper JSON
        # (avoiding double-encoding when returning a pre-serialized string).
        return payload

    # CSV
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns)
    writer.writeheader()
    for d in rows:
        writer.writerow({c: getattr(d, c, None) for c in columns})
    buffer.seek(0)
    filename = "kono_documents.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# -------------------------------------------------------------------------- #
# GET /api/v1/documents/{id}  (full detail)
# -------------------------------------------------------------------------- #
@router.get("/{document_id}", response_model=DocumentDetail)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Document)
        .options(
            selectinload(Document.items),
            selectinload(Document.discrepancies),
            selectinload(Document.audit_logs),
        )
        .where(Document.id == document_id)
    )
    doc = (await db.execute(stmt)).scalars().first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentDetail.model_validate(doc)


# -------------------------------------------------------------------------- #
# GET /api/v1/documents/{id}/file  (stream original binary for the PDF viewer)
# -------------------------------------------------------------------------- #
@router.get("/{document_id}/file")
async def stream_file(document_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    path = Path(doc.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Original file missing")
    media_type = doc.mime_type or "application/octet-stream"

    def iter_file():
        with open(path, "rb") as fh:
            yield from fh

    return StreamingResponse(iter_file(), media_type=media_type)


def _state_snapshot(doc: Document) -> dict:
    """Serializable snapshot of a document's auditable columns."""
    return {
        "invoice_number": doc.invoice_number,
        "issue_date": doc.issue_date,
        "subtotal": doc.subtotal,
        "tax_total": doc.tax_total,
        "withholding_total": doc.withholding_total,
        "grand_total": doc.grand_total,
        "kono_state": doc.kono_state,
        "processing_status": doc.processing_status,
    }


# -------------------------------------------------------------------------- #
# PUT /api/v1/documents/{id}/approve  (1-Click approval -> audited log)
# -------------------------------------------------------------------------- #
@router.put("/{document_id}/approve", response_model=ActionResponse)
async def approve_document(
    document_id: str, db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    prev = _state_snapshot(doc)
    doc.processing_status = "APPROVED"
    doc.kono_state = "GREEN"
    await _audit(db, doc, "1CLICK_APPROVE", prev, _state_snapshot(doc))
    await db.commit()
    return ActionResponse(
        id=doc.id,
        kono_state=doc.kono_state,
        processing_status=doc.processing_status,
        message="Document approved (1-Click)",
    )


# -------------------------------------------------------------------------- #
# PUT /api/v1/documents/{id}/correct  (manual correction)
# -------------------------------------------------------------------------- #
@router.put("/{document_id}/correct", response_model=ActionResponse)
async def correct_document(
    document_id: str,
    correction: DocumentCorrection,
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    prev = _state_snapshot(doc)
    # Set only the fields explicitly provided (exclude_unset), skipping `note`.
    data = correction.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field == "note":
            continue
        setattr(doc, field, value)

    await _audit(db, doc, "MANUAL_CORRECTION", prev, _state_snapshot(doc))
    await db.commit()
    return ActionResponse(
        id=doc.id,
        kono_state=doc.kono_state,
        processing_status=doc.processing_status,
        message="Document corrected",
    )


# -------------------------------------------------------------------------- #
# POST /api/v1/documents/bulk-approve  (Batch 1-Click approval)
# -------------------------------------------------------------------------- #
@router.post("/bulk-approve")
async def bulk_approve_documents(
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approves all pending/audited documents for the active user in 1-Click."""
    stmt = select(Document).where(
        ((Document.user_id == current_user.id) | (Document.user_id.is_(None)))
        & (Document.processing_status != "APPROVED")
    )
    docs = (await db.execute(stmt)).scalars().all()
    count = 0
    for doc in docs:
        prev = _state_snapshot(doc)
        doc.processing_status = "APPROVED"
        doc.kono_state = "GREEN"
        await _audit(db, doc, "1CLICK_BULK_APPROVE", prev, _state_snapshot(doc))
        count += 1

    await db.commit()
    return {
        "status": "APPROVED",
        "approved_count": count,
        "message": f"Se han aprobado {count} comprobante(s) exitosamente.",
    }


# -------------------------------------------------------------------------- #
# GET /api/v1/documents/export?format=csv|json
# -------------------------------------------------------------------------- #
# -------------------------------------------------------------------------- #
# POST /api/v1/documents/seed-demo  (Seed demo real invoices for active user)
# -------------------------------------------------------------------------- #
@router.post("/seed-demo")
async def seed_demo_documents(
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generates initial realistic test invoices for the active authenticated user."""
    demo_samples = [
        {
            "id": f"demo_{uuid.uuid4().hex[:8]}",
            "user_id": current_user.id,
            "file_name": "factura_aws_cloud_hosting.pdf",
            "file_path": "/data/storage/inbound/demo_aws.pdf",
            "invoice_number": "INV-2026-8891",
            "vendor_name": "Amazon Web Services Colombia SAS",
            "vendor_tax_id": "900.123.456-1",
            "issue_date": "2026-08-15",
            "currency": "COP",
            "subtotal": 1500000.0,
            "tax_total": 285000.0,
            "withholding_total": 0.0,
            "grand_total": 1785000.0,
            "kono_state": "GREEN",
            "processing_status": "AUDITED",
            "extraction_method": "DETERMINISTIC",
        },
        {
            "id": f"demo_{uuid.uuid4().hex[:8]}",
            "user_id": current_user.id,
            "file_name": "comprobante_papeleria_suministros.pdf",
            "file_path": "/data/storage/inbound/demo_office.pdf",
            "invoice_number": "FAC-9012",
            "vendor_name": "Office Supplies & Papelería LTDA",
            "vendor_tax_id": "800.999.111-2",
            "issue_date": "2026-08-16",
            "currency": "COP",
            "subtotal": 353361.34,
            "tax_total": 67138.66,
            "withholding_total": 0.0,
            "grand_total": 420500.0,
            "kono_state": "YELLOW",
            "processing_status": "PENDING",
            "extraction_method": "TEMPLATE",
        },
        {
            "id": f"demo_{uuid.uuid4().hex[:8]}",
            "user_id": current_user.id,
            "file_name": "factura_aws_cloud_hosting_duplicada.pdf",
            "file_path": "/data/storage/inbound/demo_aws_dup.pdf",
            "invoice_number": "INV-2026-8891",
            "vendor_name": "Amazon Web Services Colombia SAS (Duplicado)",
            "vendor_tax_id": "900.123.456-1",
            "issue_date": "2026-08-18",
            "currency": "COP",
            "subtotal": 1500000.0,
            "tax_total": 285000.0,
            "withholding_total": 0.0,
            "grand_total": 1785000.0,
            "kono_state": "RED",
            "processing_status": "REJECTED",
            "extraction_method": "DETERMINISTIC",
        },
    ]

    for d in demo_samples:
        doc = Document(**d)
        db.add(doc)
    await db.commit()

    return {
        "status": "SUCCESS",
        "created_count": len(demo_samples),
        "message": f"Se han sembrado {len(demo_samples)} facturas de prueba vinculadas a tu cuenta.",
    }


# -------------------------------------------------------------------------- #
# Helpers
# -------------------------------------------------------------------------- #
async def _audit(db: AsyncSession, doc: Document, action: str, prev, new) -> None:
    db.add(
        AuditLog(
            document_id=doc.id,
            action=action,
            previous_state=prev,
            new_state=new,
        )
    )
