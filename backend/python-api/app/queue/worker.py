import asyncio
import json
import logging
import os
from typing import Any, Awaitable, Callable, Dict, List, Optional

from app.engine.ai_fallback import AiFallback
from app.engine.validator import DeterministicValidator
from app.schemas.audit import AuditResult, ExtractedInvoice
from app.schemas.items import ExtractedInvoiceItem

logger = logging.getLogger("kono.worker")

PROCESSING_STREAM = os.environ.get("KONO_PROCESSING_STREAM", "invoice_processing_stream")
RESULT_CHANNEL = os.environ.get("KONO_RESULT_CHANNEL", "kono_feed_channel")
REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")

# Published event types shared with the WebSocket layer (US-PY-003).
DOCUMENT_PROCESSED = "DOCUMENT_PROCESSED"
METRICS_UPDATE = "METRICS_UPDATE"


class InvoiceProcessor:
    """Pure, Redis-free pipeline so it can be unit-tested in isolation.

    Any async side effects (Redis publish) are injected via callbacks, which
    keeps the financial logic deterministic and offline.
    """

    def __init__(
        self,
        validator: Optional[DeterministicValidator] = None,
        ai_fallback: Optional[AiFallback] = None,
    ) -> None:
        self.validator = validator or DeterministicValidator()
        self.ai_fallback = ai_fallback or AiFallback()

    def map_payload_to_invoice(self, payload: Dict[str, Any]) -> ExtractedInvoice:
        """Builds an ExtractedInvoice from the Rust DocumentPayload JSON."""
        words = payload.get("words") or []
        # Numbers/values are resolved by the spatial engine in a real deploy.
        # The validator focuses on arithmetic; tolerances here default to
        # the parsed totals when absent (treated as 'not declared').
        items: List[ExtractedInvoiceItem] = []
        raw_items = payload.get("items")
        if isinstance(raw_items, list):
            for i, it in enumerate(raw_items, start=1):
                items.append(
                    ExtractedInvoiceItem(
                        line_number=i,
                        description=it.get("description", ""),
                        quantity=float(it.get("quantity", 0) or 0),
                        unit_price=float(it.get("unit_price", 0) or 0),
                        total_price=float(it.get("total_price", 0) or 0),
                    )
                )
        return ExtractedInvoice(
            document_id=payload.get("document_id", ""),
            file_hash=payload.get("file_hash"),
            issue_date=payload.get("issue_date"),
            supplier_name=payload.get("supplier_name"),
            tax_id=payload.get("tax_id"),
            invoice_number=payload.get("invoice_number"),
            items=items,
            parsed_subtotal=_to_float(payload.get("subtotal")),
            parsed_tax_total=_to_float(payload.get("tax_total")),
            parsed_withholding_total=_to_float(payload.get("withholding_total")),
            parsed_total=_to_float(payload.get("total")),
            confidence_score=float(payload.get("confidence_score", 1.0)),
        )

    async def process_payload(
        self,
        payload: Dict[str, Any],
        publish: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None,
    ) -> AuditResult:
        invoice = self.map_payload_to_invoice(payload)
        result = self.validator.validate_invoice(invoice)

        # Selective AI fallback only when the deterministic engine doubted.
        if result.needs_ai_fallback:
            missing = [
                field for field, value in {
                    "issue_date": invoice.issue_date,
                    "tax_id": invoice.tax_id,
                    "invoice_number": invoice.invoice_number,
                    "subtotal": invoice.parsed_subtotal,
                    "total": invoice.parsed_total,
                }.items()
                if value is None
            ]
            if missing:
                fallback = self.ai_fallback.request_fallback(invoice, missing)
                if fallback is not None:
                    result.needs_ai_fallback = False  # resolved via AI

        if publish is not None:
            await publish({
                "type": DOCUMENT_PROCESSED,
                "document_id": invoice.document_id,
                "kono_state": result.kono_state.value,
                "calculated_subtotal": result.calculated_subtotal,
                "calculated_total": result.calculated_total,
                "confidence_score": result.confidence_score,
                "discrepancies": [d.model_dump() for d in result.discrepancies],
                "processing_time_ms": None,
            })
        return result


class ProcessingWorker:
    """Async consumer of the Redis Stream, wiring payloads to InvoiceProcessor."""

    def __init__(
        self,
        processor: Optional[InvoiceProcessor] = None,
        redis_client: Optional[Any] = None,
    ) -> None:
        self.processor = processor or InvoiceProcessor()
        self.redis = redis_client

    async def handle_event(
        self,
        payload: Dict[str, Any],
        publish: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None,
    ) -> AuditResult:
        return await self.processor.process_payload(payload, publish=publish)

    async def run(self, group: str = "kono-python-worker", delay_seconds: float = 0.5):
        """Blocking loop: reads the stream and processes each payload.

        Requires a live Redis connection (`self.redis`). Kept separate from
        `handle_event` so CI can test pure logic without Redis.
        """
        if self.redis is None:
            logger.error("ProcessingWorker.run requires a live Redis client")
            return
        while True:
            try:
                entries = await self.redis.xread(
                    {PROCESSING_STREAM: ">"}, count=10, block=2000
                )
                for _, messages in entries:
                    for msg_id, fields in messages:
                        raw = fields.get(b"payload") or fields.get("payload")
                        if raw is None:
                            continue
                        data = json.loads(raw if isinstance(raw, str) else raw.decode())
                        await self.handle_event(data)
            except Exception as exc:  # noqa: BLE001 - never crash the worker
                logger.warning("worker cycle error: %s", exc)
            await asyncio.sleep(delay_seconds)


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
