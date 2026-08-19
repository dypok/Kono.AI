from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.spatial import BoundingBox

class ExtractedInvoiceItem(BaseModel):
    line_number: int
    description: str
    quantity: float
    unit_price: float
    total_price: float
    tax_rate: Optional[float] = None
    bbox: Optional[BoundingBox] = None
    is_math_valid: bool = True

class ExtractedTable(BaseModel):
    items: List[ExtractedInvoiceItem] = []
    header_bbox: Optional[BoundingBox] = None
    table_bbox: Optional[BoundingBox] = None
    subtotal_calculated: float = 0.0
