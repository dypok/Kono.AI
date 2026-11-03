from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.vendor import VendorTemplate

router = APIRouter(prefix="/vendors", tags=["vendors"])


class VendorTemplateRead(BaseModel):
    id: str
    vendor_tax_id: str
    vendor_name: Optional[str] = None
    spatial_anchors: dict

    model_config = {"from_attributes": True}


class VendorTemplateCreate(BaseModel):
    vendor_tax_id: str
    vendor_name: Optional[str] = None
    spatial_anchors: dict


@router.get("/", response_model=List[VendorTemplateRead])
async def list_vendor_templates(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(VendorTemplate).order_by(VendorTemplate.vendor_name))).scalars().all()
    return rows


@router.get("/{tax_id}/template", response_model=VendorTemplateRead)
async def get_vendor_template(tax_id: str, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(select(VendorTemplate).where(VendorTemplate.vendor_tax_id == tax_id))
    ).scalars().first()
    if row is None:
        raise HTTPException(status_code=404, detail="No template for vendor")
    return row


@router.post("/", status_code=201, response_model=VendorTemplateRead)
async def create_vendor_template(body: VendorTemplateCreate, db: AsyncSession = Depends(get_db)):
    existing = (
        await db.execute(select(VendorTemplate).where(VendorTemplate.vendor_tax_id == body.vendor_tax_id))
    ).scalars().first()
    if existing:
        existing.spatial_anchors = body.spatial_anchors
        existing.vendor_name = body.vendor_name
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        return existing
    template = VendorTemplate(
        vendor_tax_id=body.vendor_tax_id,
        vendor_name=body.vendor_name,
        spatial_anchors=body.spatial_anchors,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}")
async def delete_vendor_template(template_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.get(VendorTemplate, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(row)
    await db.commit()
    return {"status": "SUCCESS", "message": "Template deleted successfully", "id": template_id}
