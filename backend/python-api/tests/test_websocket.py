import os
import tempfile

import pytest
from starlette.testclient import TestClient

_TMP_DB = os.path.join(tempfile.gettempdir(), "kono_test_ws.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP_DB}"
os.environ["STORAGE_DIR"] = os.path.join(tempfile.gettempdir(), "kono_test_storage_ws")

from app.core.database import Base, get_sync_engine, init_engine  # noqa: E402
from app import models  # noqa: E402, F401
from app.main import app, ws_manager  # noqa: E402


@pytest.fixture
def prepare_db():
    init_engine(os.environ["DATABASE_URL"])
    with get_sync_engine().connect() as conn:
        Base.metadata.drop_all(conn)
        Base.metadata.create_all(conn)


def test_audit_feed_echoes_connection(prepare_db):
    # Serves to validate the WS endpoint handshake + CONNECTED message without
    # requiring a live Redis (the bridge task only re-sends Redis messages).
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws/audit-feed") as ws:
            data = ws.receive_json()
            assert data["type"] == "CONNECTED"


def test_broadcast_reaches_connected_client():
    # Unit-level check of the ConnectionManager broadcast using a fake socket.
    # We validate the manager logic (connect/disconnect/broadcast) directly.
    class FakeWS:
        def __init__(self):
            self.sent = []
            self.accepted = False

        async def accept(self):
            self.accepted = True

        async def send_text(self, text):
            self.sent.append(text)

    import asyncio

    async def scenario():
        manager = ws_manager
        # empty the active set to keep the test hermetic
        manager.active.clear()
        fw = FakeWS()
        await manager.connect(fw)
        return fw, manager

    loop = asyncio.new_event_loop()
    try:
        fw, manager = loop.run_until_complete(scenario())
        loop.run_until_complete(manager.broadcast({"type": "METRICS_UPDATE", "v": 1}))
    finally:
        loop.close()
    assert fw.accepted is True
    assert len(fw.sent) == 1
    assert "METRICS_UPDATE" in fw.sent[0]
