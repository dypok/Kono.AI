from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

# Shared ORM base. Imported by all model modules so a single metadata exists
# (avoids the trap of multiple, unrelated `declarative_base()` instances).
Base = declarative_base()

from app.core.config import get_settings  # noqa: E402  (after Base for clarity)


def _ensure_storage_dir(database_url: str) -> None:
    """Creates the parent directory for a file-based (sqlite) DB if needed."""
    if database_url.startswith("sqlite"):
        # Extract the path part: "sqlite+aiosqlite:///./x.db" -> "./x.db"
        path = database_url.split("///")[-1]
        parent = Path(path).parent
        if parent and str(parent) != ".":
            parent.mkdir(parents=True, exist_ok=True)


async_engine = None
AsyncSessionLocal: async_sessionmaker[AsyncSession] = None
sync_engine = None


def init_engine(database_url: str | None = None) -> None:
    """Initializes (or re-initializes) the async engine and session factory.

    Call once at application startup. Re-initializable so tests can point at a
    temporary SQLite file and call `create_all` against the same metadata.
    """
    global async_engine, AsyncSessionLocal, sync_engine
    url = database_url or get_settings().database_url
    _ensure_storage_dir(url)

    async_engine = create_async_engine(url, echo=False, future=True)
    AsyncSessionLocal = async_sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )
    # A sync engine is useful to create schema/migrate without async ceremony.
    if url.startswith("sqlite"):
        sync_url = url.replace("+aiosqlite", "").replace("sqlite+", "sqlite://")
        sync_engine = create_engine(sync_url, future=True)


async def get_db():
    """FastAPI dependency yielding an async session (one per request)."""
    if AsyncSessionLocal is None:
        init_engine()
    async with AsyncSessionLocal() as session:
        yield session


def get_sync_engine():
    if sync_engine is None:
        init_engine()
    return sync_engine
