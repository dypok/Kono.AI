from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.document import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogRead(BaseModel):
    id: str
    document_id: str
    user_id: Optional[str] = None
    action: str
    previous_state: Optional[dict] = None
    new_state: Optional[dict] = None
    timestamp: Optional[datetime] = None

    model_config = {"from_attributes": True}


@router.get("/", response_model=List[AuditLogRead])
async def list_audit_logs(
    document_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    if document_id:
        stmt = stmt.where(AuditLog.document_id == document_id)
    rows = (await db.execute(stmt)).scalars().all()
    return rows
