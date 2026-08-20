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
        # Lightweight migration for new columns (US-REQ-001/002)
        try:
            from sqlalchemy import text

            with sync_engine.connect() as conn:
                for ddl in [
                    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) DEFAULT 'INVOICE'",
                    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS classifier_score FLOAT",
                    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS needs_ai_fallback BOOLEAN DEFAULT FALSE",
                    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_tokens INTEGER",
                    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_cost_usd FLOAT",
                    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_model VARCHAR(30)",
                ]:
                    try:
                        conn.execute(text(ddl))
                        conn.commit()
                    except Exception:
                        # Fallback for SQLite without IF NOT EXISTS
                        try:
                            result = conn.execute(text("PRAGMA table_info(documents)"))
                            cols = [row[1] for row in result.fetchall()]
                            col_name = ddl.split()[5]
                            if col_name not in cols:
                                # Retry without IF NOT EXISTS
                                simple_ddl = ddl.replace(" IF NOT EXISTS", "")
                                conn.execute(text(simple_ddl))
                                conn.commit()
                        except Exception:
                            pass
        except Exception:
            pass
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

