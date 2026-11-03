from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.schemas.spatial import BoundingBox

class FieldAnchorRule(BaseModel):
    anchor_text: str
    direction: str = "right" # "right" or "below"
    offset_x: float = 0.0
    offset_y: float = 0.0
    expected_bbox: Optional[BoundingBox] = None
    regex_override: Optional[str] = None

class VendorTemplateSchema(BaseModel):
    vendor_tax_id: str
    vendor_name: Optional[str] = None
    spatial_anchors: Dict[str, FieldAnchorRule] = {}
    total_matched_count: int = 1

class ExtractedInvoicePayload(BaseModel):
    invoice_number: Optional[str] = None
    issue_date: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_tax_id: Optional[str] = None
    subtotal: Optional[float] = None
    tax_total: Optional[float] = None
    grand_total: Optional[float] = None
    extraction_method: str = "DETERMINISTIC"
    confidence_score: float = 1.0
    bounding_boxes: Dict[str, Any] = {}
