import os
import tempfile

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Point to a temporary SQLite DB BEFORE importing the app/models.
_TMP_DB = os.path.join(tempfile.gettempdir(), "kono_test_api.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP_DB}"
os.environ["STORAGE_DIR"] = os.path.join(tempfile.gettempdir(), "kono_test_storage")

from app.core.database import Base, get_sync_engine, init_engine  # noqa: E402
from app import models  # noqa: E402, F401
from app.main import app  # noqa: E402


@pytest_asyncio.fixture
async def client():
    init_engine(os.environ["DATABASE_URL"])
    with get_sync_engine().connect() as conn:
        Base.metadata.drop_all(conn)
        Base.metadata.create_all(conn)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


_png_counter = 0

def png_bytes(seed: int | None = None) -> bytes:
    # Minimal PNG header + payload so the upload MIME/persist path works.
    # Make each call unique to avoid deduplication in batch tests.
    global _png_counter
    if seed is None:
        _png_counter += 1
        seed = _png_counter
    return b"\x89PNG\r\n\x1a\n" + seed.to_bytes(4, "big") + b"\x00" * 60


def make_files(count: int):
    return [
        ("files", (f"inv_{i}.png", png_bytes(), "image/png"))
        for i in range(count)
    ]


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_upload_single_document(client):
    r = await client.post(
        "/api/v1/documents/upload",
        files=[("file", ("inv_1.png", png_bytes(), "image/png"))],
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["processing_status"] == "PENDING"
    assert body["id"]


@pytest.mark.asyncio
async def test_upload_rejects_unsupported_mime(client):
    r = await client.post(
        "/api/v1/documents/upload",
        files=[("file", ("f.txt", b"hello", "text/plain"))],
    )
    assert r.status_code == 415


@pytest.mark.asyncio
async def test_upload_batch_of_10(client):
    for i in range(10):
        r = await client.post(
            "/api/v1/documents/upload",
            files=[("file", (f"inv_{i}.png", png_bytes(), "image/png"))],
        )
        assert r.status_code == 201, f"batch item {i} failed: {r.text}"

    listing = await client.get("/api/v1/documents/")
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] == 10
    assert len(body["items"]) == 10


@pytest.mark.asyncio
async def test_list_paginated_and_filtered(client):
    for i in range(3):
        await client.post(
            "/api/v1/documents/upload",
            files=[("file", (f"inv_{i}.png", png_bytes(), "image/png"))],
        )
    r = await client.get("/api/v1/documents/?page=1&page_size=2")
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) == 2
    assert body["total_pages"] == 2


@pytest.mark.asyncio
async def test_document_detail_and_missing(client):
    up = await client.post(
        "/api/v1/documents/upload",
        files=[("file", ("inv.png", png_bytes(), "image/png"))],
    )
    doc_id = up.json()["id"]

    detail = await client.get(f"/api/v1/documents/{doc_id}")
    assert detail.status_code == 200
    assert detail.json()["id"] == doc_id

    missing = await client.get("/api/v1/documents/does-not-exist")
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_approve_1_click(client):
    up = await client.post(
        "/api/v1/documents/upload",
        files=[("file", ("inv.png", png_bytes(), "image/png"))],
    )
    doc_id = up.json()["id"]

    r = await client.put(f"/api/v1/documents/{doc_id}/approve")
    assert r.status_code == 200
    assert r.json()["processing_status"] == "APPROVED"

    # Audit log should have recorded the 1CLICK_APPROVE action.
    logs = await client.get(f"/api/v1/audit/?document_id={doc_id}")
    bodies = logs.json()
    assert any(a["action"] == "1CLICK_APPROVE" for a in bodies)


@pytest.mark.asyncio
async def test_correct_document(client):
    up = await client.post(
        "/api/v1/documents/upload",
        files=[("file", ("inv.png", png_bytes(), "image/png"))],
    )
    doc_id = up.json()["id"]

    r = await client.put(
        f"/api/v1/documents/{doc_id}/correct",
        json={"invoice_number": "INV-2026-FIXED", "grand_total": 999.0},
    )
    assert r.status_code == 200

    detail = (await client.get(f"/api/v1/documents/{doc_id}")).json()
    assert detail["invoice_number"] == "INV-2026-FIXED"


@pytest.mark.asyncio
async def test_export_csv_and_json(client):
    await client.post(
        "/api/v1/documents/upload",
        files=[("file", ("inv.png", png_bytes(), "image/png"))],
    )
    csv_resp = await client.get("/api/v1/documents/export?format=csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]

    json_resp = await client.get("/api/v1/documents/export?format=json")
    assert json_resp.status_code == 200
    assert json_resp.text.strip().startswith("[")
