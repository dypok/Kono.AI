from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.audit import KonoState


class MoneyRangeQuery(BaseModel):
    """Optional money range filter used by the list endpoint."""


class DocumentListItem(BaseModel):
    id: str
    user_id: Optional[str] = None
    file_name: Optional[str] = None
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_tax_id: Optional[str] = None
    issue_date: Optional[str] = None
    currency: Optional[str] = None
    subtotal: Optional[float] = None
    grand_total: Optional[float] = None
    kono_state: Optional[str] = None
    processing_status: Optional[str] = None
    extraction_method: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InvoiceItemRead(BaseModel):
    line_number: int
    description: Optional[str] = None
    quantity: float = 0.0
    unit_price: float = 0.0
    total_price: float = 0.0
    is_math_valid: Optional[bool] = None
    bbox_coordinates: Optional[list] = None

    model_config = {"from_attributes": True}


class DiscrepancyRead(BaseModel):
    field_name: str
    alert_type: str
    expected_value: Optional[str] = None
    extracted_value: Optional[str] = None
    delta_amount: Optional[float] = None
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class DocumentDetail(BaseModel):
    id: str
    user_id: Optional[str] = None
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    mime_type: Optional[str] = None
    file_size_bytes: Optional[int] = 0
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_tax_id: Optional[str] = None
    issue_date: Optional[str] = None
    currency: Optional[str] = None
    subtotal: Optional[float] = None
    tax_total: Optional[float] = None
    withholding_total: Optional[float] = None
    grand_total: Optional[float] = None
    extraction_method: Optional[str] = None
    kono_state: Optional[str] = None
    processing_status: Optional[str] = None
    processing_time_ms: Optional[float] = None
    bounding_boxes: Optional[dict] = None
    items: List[InvoiceItemRead] = Field(default_factory=list)
    discrepancies: List[DiscrepancyRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class DocumentCorrection(BaseModel):
    invoice_number: Optional[str] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    subtotal: Optional[float] = None
    tax_total: Optional[float] = None
    withholding_total: Optional[float] = None
    grand_total: Optional[float] = None
    note: Optional[str] = None


class ActionResponse(BaseModel):
    id: str
    kono_state: Optional[str] = None
    processing_status: str
    message: str
