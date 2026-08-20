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

    # ---- Persistence ----
    database_url: str = field(
        default_factory=lambda: os.environ.get(
            "DATABASE_URL", 
            "sqlite+aiosqlite:////data/storage/kono.db" if os.path.exists("/data/storage") else "sqlite+aiosqlite:///./data/storage/kono.db"
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

    @property
    def cors_origins(self) -> list:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Returns a cached Settings instance (config is read once)."""
    return Settings()
