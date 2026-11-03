import os
from dataclasses import dataclass, field
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    """Runtime configuration loaded from environment variables.

    All values are read from the environment (never hardcoded secrets), with
    safe defaults for local development. Follows the pattern established in
    docker-compose (REDIS_URL, DATABASE_URL, STORAGE_DIR, WEBHOOK_SECRET).
    """

    # ---- Persistence (PostgreSQL Supabase) ----
    database_url: str = field(
        default_factory=lambda: os.environ.get(
            "DATABASE_URL", 
            "postgresql+asyncpg://kono_app.avkxhplapmibhyleywzd:KonoAiSupabaseSecure2026!@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
        )
    )

    # ---- Storage ----
    storage_dir: str = field(
        default_factory=lambda: os.environ.get(
            "STORAGE_DIR", 
            "/data/storage" if os.path.exists("/data/storage") else "./data/storage"
        )
    )

    # ---- Streaming / Broker ----
    redis_url: str = field(
        default_factory=lambda: os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")
    )
    kono_feed_channel: str = field(
        default_factory=lambda: os.environ.get("KONO_FEED_CHANNEL", "kono_feed_channel")
    )

    # ---- API ----
    allowed_origins: str = field(
        default_factory=lambda: os.environ.get(
            "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
        )
    )

    # ---- Inbound Webhooks (n8n / external sources) ----
    # MUST match the header sent by the n8n workflow (US-INT-001) so the
    # inbound flow works without re-editing the imported JSON template:
    # X-Kono-Webhook-Secret = kono_secret_n8n_key_2026
    webhook_secret: str = field(
        default_factory=lambda: os.environ.get(
            "WEBHOOK_SECRET", "kono_secret_n8n_key_2026"
        )
    )
    # Max accepted inbound file size (bytes).
    max_inbound_bytes: int = field(
        default_factory=lambda: int(os.environ.get("MAX_INBOUND_BYTES", str(15 * 1024 * 1024)))
    )

    # ---- Inbound email / IMAP poller ----
    imap_host: str = field(default_factory=lambda: os.environ.get("IMAP_HOST", "imap.gmail.com"))
    imap_port: int = field(default_factory=lambda: int(os.environ.get("IMAP_PORT", "993")))
    imap_user: str = field(default_factory=lambda: os.environ.get("IMAP_USER", ""))
    imap_password: str = field(default_factory=lambda: os.environ.get("IMAP_PASSWORD", ""))
    imap_poll_interval_sec: int = field(
        default_factory=lambda: int(os.environ.get("IMAP_POLL_INTERVAL_SEC", "60"))
    )

    # ---- AI Fallback (OpenAI API Key) ----
    openai_api_key: str = field(
        default_factory=lambda: os.environ.get("OPENAI_API_KEY", "")
    )

    @property
    def cors_origins(self) -> list:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Returns a cached Settings instance (config is read once)."""
    return Settings()
