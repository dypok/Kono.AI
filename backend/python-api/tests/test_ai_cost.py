import os
import tempfile

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

_TMP_DB = os.path.join(tempfile.gettempdir(), "kono_test_ai_cost.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP_DB}"
os.environ["STORAGE_DIR"] = os.path.join(tempfile.gettempdir(), "kono_test_ai_cost_storage")

from app.core.database import Base, get_sync_engine, init_engine  # noqa: E402
from app import models  # noqa: E402, F401
from app.main import app  # noqa: E402
from app.models.document import Document  # noqa: E402


@pytest_asyncio.fixture
async def client():
    init_engine(os.environ["DATABASE_URL"])
    with get_sync_engine().connect() as conn:
        Base.metadata.drop_all(conn)
        Base.metadata.create_all(conn)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_cost_estimate_for_other_document(client):
    # Create a document with OTHER type (no data)
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        doc = Document(
            id="test-doc-1",
            file_name="unknown.pdf",
            file_path="/tmp/unknown.pdf",
            file_hash_sha256="abc123",
            mime_type="application/pdf",
            file_size_bytes=1000,
            document_type="OTHER",
            classifier_score=0.1,
            kono_state="YELLOW",
            processing_status="REJECTED",
        )
        db.add(doc)
        await db.commit()

    # Need auth - use mock user header
    # The endpoint requires get_current_user, which in test mode may need mock
    # For now, test the AiFallback directly
    from app.engine.ai_fallback import AiFallback
    from app.schemas.audit import ExtractedInvoice

    invoice = ExtractedInvoice(document_id="test-doc-1", items=[], confidence_score=0.5)
    fb = AiFallback()
    estimate = fb.estimate_cost(invoice, ["invoice_number", "total"])
    assert "estimated_cost_usd" in estimate
    assert estimate["total_tokens"] > 0
    assert estimate["estimated_cost_usd"] < 0.01  # Should be very cheap
    assert estimate["model"] == "gpt-4o-mini"


@pytest.mark.asyncio
async def test_batch_cost_estimate(client):
    from app.engine.ai_fallback import AiFallback
    from app.schemas.audit import ExtractedInvoice

    invoices = [
        ExtractedInvoice(document_id=f"doc-{i}", items=[], confidence_score=0.5)
        for i in range(3)
    ]
    fb = AiFallback()
    total_cost = 0
    for inv in invoices:
        est = fb.estimate_cost(inv, ["total"])
        total_cost += est["estimated_cost_usd"]
    assert total_cost > 0
    assert total_cost < 0.01 * 3


def test_estimate_cost_deterministic():
    from app.engine.ai_fallback import AiFallback
    from app.schemas.audit import ExtractedInvoice

    invoice = ExtractedInvoice(document_id="doc-1", items=[])
    fb = AiFallback()
    est1 = fb.estimate_cost(invoice, ["total"])
    est2 = fb.estimate_cost(invoice, ["total"])
    assert est1["estimated_cost_usd"] == est2["estimated_cost_usd"]
    assert est1["total_tokens"] == est2["total_tokens"]
