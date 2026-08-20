import os
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

# Shared ORM base. Imported by all model modules so a single metadata exists
Base = declarative_base()

from app.core.config import get_settings  # noqa: E402

async_engine = None
AsyncSessionLocal: async_sessionmaker[AsyncSession] = None
sync_engine = None


def init_engine(database_url: str | None = None) -> None:
    """Initializes the async engine (asyncpg) and sync engine (psycopg2) for PostgreSQL."""
    global async_engine, AsyncSessionLocal, sync_engine
    url = database_url or get_settings().database_url

    connect_args = {}
    if "postgresql" in url or "asyncpg" in url:
        connect_args = {
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        }

    # Async Engine with connection pooling tuned for PostgreSQL / Supavisor
    async_engine = create_async_engine(
        url,
        echo=False,
        future=True,
        pool_size=10 if "sqlite" not in url else 5,
        max_overflow=20 if "sqlite" not in url else 10,
        pool_pre_ping=True,
        connect_args=connect_args,
    )
    AsyncSessionLocal = async_sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )

    # Sync Engine for metadata and DDL assertions (lazy fallback if psycopg2 is installed)
    sync_url = os.environ.get(
        "DATABASE_SYNC_URL",
        url.replace("postgresql+asyncpg://", "postgresql+psycopg2://").replace(
            "sqlite+aiosqlite://", "sqlite://"
        ),
    )
    try:
        sync_engine = create_engine(sync_url, future=True, pool_pre_ping=True)
    except Exception:
        sync_engine = None


async def get_db():
    """FastAPI dependency yielding an async PostgreSQL session per request."""
    if AsyncSessionLocal is None:
        init_engine()
    async with AsyncSessionLocal() as session:
        yield session


def get_sync_engine():
    if sync_engine is None:
        init_engine()
    return sync_engine

