import asyncio
import contextlib
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, get_sync_engine, init_engine
from app import models  # noqa: F401  (registers all ORM models on Base)
from app.api.v1 import audit as audit_router
from app.api.v1 import ai as ai_router
from app.api.v1 import documents as documents_router
from app.api.v1 import vendors as vendors_router
from app.api.v1 import auth as auth_router
from app.api.v1 import inbound as inbound_router
from app.api.v1 import integrations as integrations_router
from app.api.v1.websockets import ConnectionManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kono.api")

# Initialize PostgreSQL engine on module import
init_engine()

from app.services.inbox_scheduler import inbox_scheduler
from app.services.redis_pipeline_consumer import redis_pipeline_consumer

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure async engine is active
    init_engine()

    # Start the Redis -> WebSocket bridge in the background (non-blocking).
    bridge = asyncio.create_task(
        ws_manager.run_redis_bridge(settings.redis_url, settings.kono_feed_channel)
    )
    # Start the 60-second periodic background inbox scanner
    inbox_scheduler.start()

    # Start the Rust Core -> Python Spatial Engine Redis Stream consumer
    redis_pipeline_consumer.start(settings.redis_url, ws_manager=ws_manager)
    logger.info("🦀 Kono API started; Rust Redis Pipeline Consumer & WS bridge launched")
    yield
    bridge.cancel()
    inbox_scheduler.stop()
    redis_pipeline_consumer.stop()


settings = get_settings()

app = FastAPI(
    title="Kono.ai Financial Invoicing API",
    version="1.0.0",
    description="Deterministic Extractor, Validator and Financial Reconciler API",
    lifespan=lifespan,
)

@app.middleware("http")
async def add_process_time_header(request, call_next):
    import time
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time_ms = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Process-Time"] = f"{process_time_ms:.2f}"
    response.headers["Server-Timing"] = f"total;dur={process_time_ms:.2f}"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time", "Server-Timing"],
)

# Shared WebSocket connection manager + Redis bridge.
ws_manager = ConnectionManager()
app.state.ws_manager = ws_manager

# Mount versioned routers under /api/v1.
app.include_router(documents_router.router, prefix="/api/v1")
app.include_router(vendors_router.router, prefix="/api/v1")
app.include_router(audit_router.router, prefix="/api/v1")
app.include_router(ai_router.router, prefix="/api/v1")
app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(inbound_router.router, prefix="/api/v1")
app.include_router(integrations_router.router, prefix="/api/v1")


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
