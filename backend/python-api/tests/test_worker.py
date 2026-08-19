import pytest

from app.engine.validator import DeterministicValidator
from app.queue.worker import DOCUMENT_PROCESSED, InvoiceProcessor, ProcessingWorker
from app.schemas.audit import KonoState


def payload(**overrides):
    base = dict(
        document_id="doc-10",
        file_hash="bbb" * 21,
        issue_date="2026-08-18",
        supplier_name="Beta SA",
        tax_id="900123456-8",
        invoice_number="INV-2026-010",
        items=[
            {"description": "Item A", "quantity": 1.0, "unit_price": 100.0, "total_price": 100.0},
        ],
        subtotal=100.0,
        tax_total=19.0,
        withholding_total=0.0,
        total=119.0,
        confidence_score=1.0,
    )
    base.update(overrides)
    return base


async def pytest_coro():
    """Minimal async no-op coroutine usable as an injected publish callback."""



@pytest.mark.asyncio
async def test_process_payload_green_and_publishes():
    processor = InvoiceProcessor()
    published = []

    async def publish(event):
        published.append(event)

    result = await processor.process_payload(payload(), publish=publish)
    assert result.kono_state == KonoState.GREEN
    assert len(published) == 1
    assert published[0]["type"] == DOCUMENT_PROCESSED
    assert published[0]["kono_state"] == "GREEN"
    assert published[0]["document_id"] == "doc-10"


@pytest.mark.asyncio
async def test_process_payload_triggers_fallback_on_low_confidence():
    # Use a validator whose score threshold triggers needs_ai_fallback=true;
    # with no AI client injected the fallback returns None gracefully.
    processor = InvoiceProcessor(
        validator=DeterministicValidator(),
        # ai_fallback defaults to AiFallback(None) -> deterministic-only.
    )
    result = await processor.process_payload(
        payload(confidence_score=0.5),
        publish=lambda _: pytest_coro(),
    )
    # Deterministic engine flags the low-confidence, then flags AI fallback
    # but with no client it degrades to None and remains flagged.
    assert result.needs_ai_fallback is True


@pytest.mark.asyncio
async def test_worker_handle_event_pure():
    worker = ProcessingWorker()
    result = await worker.handle_event(payload())
    assert result.kono_state == KonoState.GREEN


def test_map_payload_to_invoice_builds_items():
    processor = InvoiceProcessor()
    inv = processor.map_payload_to_invoice(payload())
    assert len(inv.items) == 1
    assert inv.parsed_subtotal == 100.0
    assert inv.tax_id == "900123456-8"
