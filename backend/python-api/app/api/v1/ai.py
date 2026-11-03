import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.supabase_auth import get_current_user, SupabaseUser
from app.engine.ai_fallback import AiFallback
from app.models.document import Document
from app.schemas.audit import ExtractedInvoice
from app.schemas.items import ExtractedInvoiceItem

logger = logging.getLogger("kono.api.ai")

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_ai_fallback_client(
    provided_key: Optional[str] = None,
    provider: str = "openai",
) -> AiFallback:
    provider = (provider or "openai").lower()
    key = provided_key or get_settings().openai_api_key
    if not key:
        return AiFallback(client=None)

    try:
        if provider == "gemini":
            from openai import OpenAI
            # Google Gemini endpoint compatible con OpenAI SDK
            return AiFallback(
                client=OpenAI(
                    api_key=key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                )
            )
        elif provider == "claude":
            # Anthropic o proxy OpenAI-compatible
            from openai import OpenAI
            return AiFallback(client=OpenAI(api_key=key))
        else:
            from openai import OpenAI
            return AiFallback(client=OpenAI(api_key=key))
    except Exception as e:
        logger.warning(f"No se pudo inicializar el cliente IA para {provider}: {e}")
        return AiFallback(client=None)


class CostEstimateRequest(BaseModel):
    document_id: str
    conflicting_fields: Optional[List[str]] = None
    provider: Optional[str] = "openai"


class BatchCostEstimateRequest(BaseModel):
    document_ids: List[str]
    conflicting_fields: Optional[List[str]] = None
    api_key: Optional[str] = None
    provider: Optional[str] = "openai"


class AnalyzeRequest(BaseModel):
    conflicting_fields: Optional[List[str]] = None
    force: bool = False
    api_key: Optional[str] = None
    provider: Optional[str] = "openai"


def _doc_to_invoice(doc: Document) -> ExtractedInvoice:
    """Convert Document ORM to ExtractedInvoice for AI processing."""
    items = []
    for it in doc.items or []:
        items.append(
            ExtractedInvoiceItem(
                line_number=it.line_number,
                description=it.description or "",
                quantity=it.quantity or 0,
                unit_price=it.unit_price or 0,
                total_price=it.total_price or 0,
            )
        )
    return ExtractedInvoice(
        document_id=doc.id,
        invoice_number=doc.invoice_number,
        supplier_name=doc.vendor_name,
        tax_id=doc.vendor_tax_id,
        issue_date=doc.issue_date,
        parsed_subtotal=doc.subtotal,
        parsed_tax_total=doc.tax_total,
        parsed_withholding_total=doc.withholding_total,
        parsed_total=doc.grand_total,
        items=items,
        confidence_score=0.5 if doc.document_type == "OTHER" else 0.9,
    )


@router.post("/cost-estimate")
async def estimate_cost(
    body: CostEstimateRequest,
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Estimate AI cost for a single document before confirming."""
    doc = await db.get(Document, body.document_id)
    if not doc or (doc.user_id not in [current_user.id, "b1a74a90-f715-4432-8e94-1a4dd43964dc", "mock-supabase-user-uuid", None] and doc.user_id != current_user.id):
        # Allow if doc exists, even if user_id mismatch for demo; check existence first
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
    if doc.document_type != "OTHER" and not body.conflicting_fields:
        # If it's already an invoice with data, cost is 0 unless forced
        return {
            "document_id": body.document_id,
            "document_type": doc.document_type,
            "needs_ai": False,
            "message": "El documento ya contiene datos. No se requiere IA.",
            "estimated_cost_usd": 0.0,
            "total_tokens": 0,
        }

    invoice = _doc_to_invoice(doc)
    fields = body.conflicting_fields or ["invoice_number", "subtotal", "total", "tax_id"]
    fallback = AiFallback()
    estimate = fallback.estimate_cost(invoice, fields)
    return {
        "document_id": body.document_id,
        "document_type": doc.document_type,
        "needs_ai": True,
        "conflicting_fields": fields,
        **estimate,
    }


@router.post("/cost-estimate/batch")
async def estimate_batch_cost(
    body: BatchCostEstimateRequest,
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Estimate total AI cost for a batch of documents."""
    if not body.document_ids:
        raise HTTPException(status_code=400, detail="No document_ids provided")
    total_cost = 0.0
    total_tokens = 0
    details = []
    for doc_id in body.document_ids:
        doc = await db.get(Document, doc_id)
        if not doc:
            continue
        invoice = _doc_to_invoice(doc)
        fields = body.conflicting_fields or ["invoice_number", "subtotal", "total"]
        estimate = AiFallback().estimate_cost(invoice, fields)
        total_cost += estimate["estimated_cost_usd"]
        total_tokens += estimate["total_tokens"]
        details.append({"document_id": doc_id, **estimate})

    return {
        "document_ids": body.document_ids,
        "count": len(details),
        "total_estimated_cost_usd": round(total_cost, 6),
        "total_tokens": total_tokens,
        "details": details,
        "message": f"Costo total estimado para {len(details)} documentos: ${round(total_cost, 6)} USD",
    }


@router.post("/analyze/{document_id}")
async def analyze_with_ai(
    document_id: str,
    body: AnalyzeRequest,
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_openai_key: Optional[str] = Header(None, alias="X-OpenAI-Api-Key"),
):
    """Trigger AI fallback for a document that had no data.

    Only allowed when document_type == OTHER or needs_ai_fallback is true.
    Persists the result and updates the document.
    """
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Only allow AI for OTHER or when explicitly forced
    if doc.document_type != "OTHER" and not body.force:
        raise HTTPException(
            status_code=400,
            detail="El documento ya contiene datos. Use force=true para forzar IA.",
        )

    invoice = _doc_to_invoice(doc)
    fields = body.conflicting_fields or ["invoice_number", "subtotal", "total", "tax_id", "issue_date"]
    api_key_to_use = body.api_key or x_openai_key
    fallback = _get_ai_fallback_client(api_key_to_use, body.provider or "openai")
    estimate = fallback.estimate_cost(invoice, fields)

    # Try to call AI if client is configured (will return None if no client)
    result = fallback.request_fallback(invoice, fields)
    if result is None:
        provider_name = (body.provider or "OpenAI").capitalize()
        return {
            "document_id": document_id,
            "status": "NO_AI_CLIENT",
            "message": f"No se encontró API key válida para {provider_name}. Configure su API Key en Ajustes.",
            **estimate,
        }

    # If AI returned data, update document
    if result.invoice_number:
        doc.invoice_number = result.invoice_number
    if result.tax_id:
        doc.vendor_tax_id = result.tax_id
    if result.subtotal is not None:
        doc.subtotal = result.subtotal
    if result.tax_total is not None:
        doc.tax_total = result.tax_total
    if result.total is not None:
        doc.grand_total = result.total
    if result.issue_date:
        doc.issue_date = result.issue_date

    doc.needs_ai_fallback = False
    doc.ai_tokens = estimate["total_tokens"]
    doc.ai_cost_usd = estimate["estimated_cost_usd"]
    doc.ai_model = fallback.MODEL
    doc.extraction_method = "AI_FALLBACK"
    doc.document_type = "INVOICE"
    doc.kono_state = "YELLOW"

    await db.commit()
    await db.refresh(doc)

    return {
        "document_id": document_id,
        "status": "SUCCESS",
        "message": "Documento analizado con IA exitosamente.",
        "document": {
            "id": doc.id,
            "invoice_number": doc.invoice_number,
            "document_type": doc.document_type,
            "kono_state": doc.kono_state,
        },
        **estimate,
    }


@router.post("/analyze/batch")
async def analyze_batch_with_ai(
    body: BatchCostEstimateRequest,
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_openai_key: Optional[str] = Header(None, alias="X-OpenAI-Api-Key"),
):
    """Trigger AI fallback for a batch of documents under user demand."""
    if not body.document_ids:
        raise HTTPException(status_code=400, detail="No document_ids provided")

    results = []
    total_tokens = 0
    total_cost = 0.0
    api_key_to_use = body.api_key or x_openai_key
    fallback = _get_ai_fallback_client(api_key_to_use, body.provider or "openai")
    fields = body.conflicting_fields or ["invoice_number", "subtotal", "total", "tax_id", "issue_date"]

    for doc_id in body.document_ids:
        doc = await db.get(Document, doc_id)
        if not doc:
            continue

        invoice = _doc_to_invoice(doc)
        estimate = fallback.estimate_cost(invoice, fields)
        total_tokens += estimate["total_tokens"]
        total_cost += estimate["estimated_cost_usd"]

        result = fallback.request_fallback(invoice, fields)
        if result is not None:
            if result.invoice_number:
                doc.invoice_number = result.invoice_number
            if result.tax_id:
                doc.vendor_tax_id = result.tax_id
            if result.subtotal is not None:
                doc.subtotal = result.subtotal
            if result.tax_total is not None:
                doc.tax_total = result.tax_total
            if result.total is not None:
                doc.grand_total = result.total
            if result.issue_date:
                doc.issue_date = result.issue_date

            doc.needs_ai_fallback = False
            doc.ai_tokens = estimate["total_tokens"]
            doc.ai_cost_usd = estimate["estimated_cost_usd"]
            doc.ai_model = fallback.MODEL
            doc.extraction_method = "AI_FALLBACK"
            doc.document_type = "INVOICE"
            doc.kono_state = "YELLOW"
            await db.commit()

        results.append({
            "document_id": doc_id,
            "status": "SUCCESS" if result is not None else "ESTIMATE_ONLY",
            "invoice_number": doc.invoice_number,
            "estimated_cost_usd": estimate["estimated_cost_usd"],
        })

    return {
        "processed_count": len(results),
        "total_estimated_cost_usd": round(total_cost, 6),
        "total_tokens": total_tokens,
        "results": results,
        "message": f"Se procesaron {len(results)} comprobantes con IA.",
    }
