import asyncio
import json
import logging
from typing import Dict, Optional, Set

from fastapi import WebSocket

logger = logging.getLogger("kono.ws")


class ConnectionManager:
    """Tracks active WebSocket clients and broadcasts audit events.

    One manager instance is shared app-wide via the FastAPI app state so both
    the REST endpoints and the Redis bridge can push DOCUMENT_PROCESSED /
    METRICS_UPDATE events to every connected front-end client in real time.
    """

    def __init__(self) -> None:
        self.active: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.active.discard(websocket)

    @property
    def active_count(self) -> int:
        return len(self.active)

    async def broadcast(self, message: dict) -> None:
        """Sends a dict payload to every connected client, dropping dead ones."""
        text = json.dumps(message, default=str)
        dead: Set[WebSocket] = set()
        for ws in list(self.active):
            try:
                await ws.send_text(text)
            except Exception:  # noqa: BLE001 - client gone
                dead.add(ws)
        if dead:
            async with self._lock:
                self.active.difference_update(dead)

    # ------------------------------------------------------------------ #
    # Redis bridge
    # ------------------------------------------------------------------ #
    async def run_redis_bridge(self, redis_url: str, channel: str) -> None:
        """Background task: subscribe to a Redis channel and broadcast events.

        Uses redis-py's pub/sub connection; reconnects on failures so the
        WebSocket feed survives Redis restarts.
        """
        import redis.asyncio as aioredis

        while True:
            try:
                redis = await aioredis.from_url(redis_url)
                pubsub = redis.pubsub()
                await pubsub.subscribe(channel)
                logger.info("WS bridge subscribed to Redis channel %s", channel)
                async for message in pubsub.listen():
                    if message.get("type") != "message":
                        continue
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode()
                    try:
                        payload = json.loads(data)
                    except (json.JSONDecodeError, TypeError):
                        payload = {"type": "RAW", "value": data}
                    await self.broadcast(payload)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001
                logger.warning("WS bridge error, reconnecting: %s", exc)
                await asyncio.sleep(2)
