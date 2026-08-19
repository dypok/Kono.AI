import os
import tempfile
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import pytest
import pytest_asyncio

_TMP_DB = os.path.join(tempfile.gettempdir(), "kono_test_email.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP_DB}"
os.environ["STORAGE_DIR"] = os.path.join(tempfile.gettempdir(), "kono_storage_email")

from app.core.config import get_settings  # noqa: E402
import app.core.database as database  # noqa: E402
from app.core.database import Base, get_sync_engine, init_engine  # noqa: E402
from app import models  # noqa: E402, F401
from app.watcher.email_poller import DeferredEmailPoller  # noqa: E402


def make_email_with_attachments() -> MIMEMultipart:
    msg = MIMEMultipart()
    msg["From"] = "proveedor@acme.com"
    msg["Subject"] = "Factura de compra"
    msg["Date"] = "Tue, 18 Aug 2026 10:00:00 -0500"
    msg.attach(MIMEText("Factura adjunta", "plain"))
    pdf = MIMEApplication(b"%PDF-1.4 test invoice\n", _subtype="pdf")
    pdf.add_header("Content-Disposition", "attachment", filename="factura.pdf")
    msg.attach(pdf)
    return msg


def test_extract_attachments_picks_only_supported():
    poller = DeferredEmailPoller(get_settings())
    msg = make_email_with_attachments()
    atts = poller.extract_attachments(msg)
    assert len(atts) == 1
    filename, data, mime = atts[0]
    assert filename == "factura.pdf"
    assert mime == "application/pdf"
    assert b"%PDF-1.4" in data


def test_extract_metadata():
    poller = DeferredEmailPoller(get_settings())
    meta = poller.extract_metadata(make_email_with_attachments())
    assert meta["from"] == "proveedor@acme.com"
    assert meta["subject"] == "Factura de compra"


def test_is_attachment_supported():
    poller = DeferredEmailPoller(get_settings())
    text = MIMEText("cuerpo")
    assert not poller.is_attachment_supported(text)


@pytest.mark.asyncio
async def test_persist_and_register_creates_document():
    init_engine(os.environ["DATABASE_URL"])
    with get_sync_engine().connect() as conn:
        Base.metadata.drop_all(conn)
        Base.metadata.create_all(conn)

    poller = DeferredEmailPoller(get_settings())
    doc_id = await poller.persist_and_register(
        "factura.pdf",
        b"%PDF-1.4 test",
        "application/pdf",
        {"from": "proveedor@acme.com"},
    )
    assert doc_id

    # Verify the Document row exists.
    from sqlalchemy import select

    from app.models.document import Document

    async with database.AsyncSessionLocal() as session:
        row = (await session.execute(select(Document).where(Document.id == doc_id))).scalars().first()
        assert row is not None
        assert row.file_name == "factura.pdf"
        assert row.kono_state == "YELLOW"


def test_parse_search_ids():
    assert DeferredEmailPoller._parse_search_ids([b"1 2 3"]) == ["1", "2", "3"]
    assert DeferredEmailPoller._parse_search_ids([b""]) == []
