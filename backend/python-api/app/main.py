import asyncio
import contextlib
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, get_sync_engine, init_engine
from app import models  # noqa: F401  (registers all ORM models on Base)
from app.api.v1 import audit as audit_router
from app.api.v1 import documents as documents_router
from app.api.v1 import vendors as vendors_router
from app.api.v1 import auth as auth_router
from app.api.v1 import inbound as inbound_router
from app.api.v1.websockets import ConnectionManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kono.api")

app = FastAPI(
    title="Kono.ai Financial Invoicing API",
    version="1.0.0",
    description="Deterministic Extractor, Validator and Financial Reconciler API",
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared WebSocket connection manager + Redis bridge.
ws_manager = ConnectionManager()
app.state.ws_manager = ws_manager

# Mount versioned routers under /api/v1.
app.include_router(documents_router.router, prefix="/api/v1")
app.include_router(vendors_router.router, prefix="/api/v1")
app.include_router(audit_router.router, prefix="/api/v1")
app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(inbound_router.router, prefix="/api/v1")


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize async engine and create tables for the configured DB.
    init_engine()
    with get_sync_engine().connect() as conn:
        Base.metadata.create_all(conn)

    # Start the Redis -> WebSocket bridge in the background (non-blocking).
    bridge = asyncio.create_task(
        ws_manager.run_redis_bridge(settings.redis_url, settings.kono_feed_channel)
    )
    logger.info("Kono API started; WS bridge task launched")
    yield
    bridge.cancel()


# FastAPI lifespan is the supported way to run startup/shutdown in modern
# versions. We still expose `on_event` fallback for very old runtimes.
app.router.lifespan_context = lifespan


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "kono-python-api"}


@app.get("/api/v1/ping")
async def ping():
    return {"message": "pong", "kono_status": "ready"}


@app.websocket("/api/v1/ws/audit-feed")
async def websocket_audit_feed(websocket: WebSocket):
    """Real-time audit feed: documents processed and metrics updates."""
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({"type": "CONNECTED", "message": "audit feed ready"})
        # Keep the connection alive; inbound messages are ignored.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
