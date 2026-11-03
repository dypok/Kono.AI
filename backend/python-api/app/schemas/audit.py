from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.items import ExtractedInvoiceItem


class KonoState(str, Enum):
    """Audit state assigned by the deterministic validator (Kono mascot)."""
    GREEN = "GREEN"      # Math exact, NIT valid, no duplicates -> auto-approved
    YELLOW = "YELLOW"    # Cents off, item discrepancy or low reading confidence
    RED = "RED"          # Duplicate (SHA-256) or already-paid invoice -> blocked


class DiscrepancyKind(str, Enum):
    """Typed reasons for registering a discrepancy in the `discrepancies` table."""
    SUBTOTAL_MISMATCH = "SUBTOTAL_MISMATCH"
    TAX_MISMATCH = "TAX_MISMATCH"
    TOTAL_MISMATCH = "TOTAL_MISMATCH"
    ITEM_TOTAL_MISMATCH = "ITEM_TOTAL_MISMATCH"
    DUPLICATE_HASH = "DUPLICATE_HASH"
    DUPLICATE_INVOICE_NUMBER = "DUPLICATE_INVOICE_NUMBER"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    INVALID_TAX_ID = "INVALID_TAX_ID"
    MISSING_FIELD = "MISSING_FIELD"


class Discrepancy(BaseModel):
    """A single auditable deviation between expected and extracted values."""
    field: str
    kind: DiscrepancyKind
    expected: Optional[float] = None
    extracted: Optional[float] = None
    delta: Optional[float] = None
    message: str


class AuditResult(BaseModel):
    """Outcome of running the deterministic validator over one invoice."""
    kono_state: KonoState
    calculated_subtotal: float
    extracted_subtotal: Optional[float]
    calculated_total: Optional[float]
    extracted_total: Optional[float]
    tax_total: Optional[float]
    withholding_total: Optional[float]
    confidence_score: float = Field(ge=0.0, le=1.0)
    discrepancies: List[Discrepancy] = Field(default_factory=list)
    # True when the deterministic engine had a low score and needs a selective AI fallback.
    needs_ai_fallback: bool = False
    # Monetary deltas preserved for the `discrepancies` table.
    subtotal_delta: float = 0.0
    total_delta: float = 0.0


class ExtractedInvoice(BaseModel):
    """Normalized invoice payload produced by the spatial/vendor layer.

    This is the input contract of `DeterministicValidator.validate_invoice`
    and mirrors the `documents` / `invoice_items` tables of the schema.
    """
    document_id: str
    file_hash: Optional[str] = None
    issue_date: Optional[str] = None
    supplier_name: Optional[str] = None
    tax_id: Optional[str] = None
    invoice_number: Optional[str] = None
    items: List[ExtractedInvoiceItem] = Field(default_factory=list)
    parsed_subtotal: Optional[float] = None
    parsed_tax_total: Optional[float] = None
    parsed_withholding_total: Optional[float] = 0.0
    parsed_total: Optional[float] = None
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
