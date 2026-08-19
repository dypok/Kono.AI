import os
import tempfile

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

_TMP_DB = os.path.join(tempfile.gettempdir(), "kono_test_inbound.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP_DB}"
os.environ["STORAGE_DIR"] = os.path.join(tempfile.gettempdir(), "kono_storage_inbound")
os.environ["WEBHOOK_SECRET"] = "kono_secret_n8n_key_2026"

from app.core.config import get_settings  # noqa: E402
from app.core.database import Base, get_sync_engine, init_engine  # noqa: E402
from app import models  # noqa: E402, F401
from app.main import app  # noqa: E402

SECRET = "kono_secret_n8n_key_2026"


@pytest_asyncio.fixture
async def client():
    init_engine(os.environ["DATABASE_URL"])
    with get_sync_engine().connect() as conn:
        Base.metadata.drop_all(conn)
        Base.metadata.create_all(conn)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def pdf_bytes() -> bytes:
    return b"%PDF-1.4 Kono.ai synthetic inbound test\n"


@pytest.mark.asyncio
async def test_webhook_rejects_missing_secret(client):
    r = await client.post(
        "/api/v1/inbound/webhook",
        files=[("file", ("inv.pdf", pdf_bytes(), "application/pdf"))],
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_webhook_rejects_wrong_secret(client):
    r = await client.post(
        "/api/v1/inbound/webhook",
        files=[("file", ("inv.pdf", pdf_bytes(), "application/pdf"))],
        headers={"X-Kono-Webhook-Secret": "wrong"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_webhook_accepts_valid_secret(client):
    r = await client.post(
        "/api/v1/inbound/webhook",
        files=[("file", ("inv.pdf", pdf_bytes(), "application/pdf"))],
        headers={"X-Kono-Webhook-Secret": SECRET},
        data={"source_tag": "n8n_automated_flow"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["processing_status"] == "PENDING"
    assert body["id"]


@pytest.mark.asyncio
async def test_webhook_rejects_unsupported_mime(client):
    r = await client.post(
        "/api/v1/inbound/webhook",
        files=[("file", ("f.txt", b"hi", "text/plain"))],
        headers={"X-Kono-Webhook-Secret": SECRET},
    )
    assert r.status_code == 415


@pytest.mark.asyncio
async def test_webhook_registers_document_in_db(client):
    r = await client.post(
        "/api/v1/inbound/webhook",
        files=[("file", ("inv.pdf", pdf_bytes(), "application/pdf"))],
        headers={"X-Kono-Webhook-Secret": SECRET},
    )
    doc_id = r.json()["id"]

    detail = await client.get(f"/api/v1/documents/{doc_id}")
    assert detail.status_code == 200
    assert detail.json()["id"] == doc_id
