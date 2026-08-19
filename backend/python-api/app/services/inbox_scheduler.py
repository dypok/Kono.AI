import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List
from app.services.gmail_oauth_service import gmail_oauth_service

logger = logging.getLogger("kono.inbox_scheduler")

class InboxBackgroundScheduler:
    """
    Background worker that monitors all active user Gmail inboxes every 60 seconds
    while sessions are active, downloading invoices and applying 'KONO_INVOICE'.
    """

    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = interval_seconds
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self._task: asyncio.Task | None = None
        self._running = False

    def register_inbox_session(self, user_id: str, email: str, provider_token: str):
        """Registers or updates a user's active OAuth token for continuous 60s monitoring."""
        key = f"{user_id}:{email}"
        self.active_sessions[key] = {
            "user_id": user_id,
            "email": email,
            "provider_token": provider_token,
            "last_scanned": None,
        }
        logger.info("Registered inbox for 60s background monitoring: %s (User: %s)", email, user_id)

    def unregister_inbox_session(self, user_id: str, email: str):
        key = f"{user_id}:{email}"
        if key in self.active_sessions:
            del self.active_sessions[key]
            logger.info("Unregistered inbox monitoring: %s", email)

    async def _loop(self):
        logger.info("Started 60s Inbox Background Scanner loop")
        while self._running:
            try:
                for key, session_data in list(self.active_sessions.items()):
                    email = session_data["email"]
                    token = session_data["provider_token"]
                    uid = session_data["user_id"]
                    try:
                        logger.info("Periodic 60s check on inbox: %s", email)
                        await gmail_oauth_service.scan_and_fetch_invoices(
                            access_token=token,
                            user_id=uid,
                            max_results=10,
                        )
                        session_data["last_scanned"] = datetime.utcnow().isoformat()
                    except Exception as err:
                        logger.warning("Error scanning inbox %s in background: %s", email, err)

            except Exception as e:
                logger.error("Exception in inbox scheduler loop: %s", e)

            await asyncio.sleep(self.interval_seconds)

    def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()

inbox_scheduler = InboxBackgroundScheduler(interval_seconds=60)
