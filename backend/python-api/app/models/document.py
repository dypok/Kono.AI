import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.schemas.audit import KonoState


def _uuid() -> str:
    return str(uuid.uuid4())


class Document(Base):
    """Master record for every processed invoice/comprobante (db_v0.documents)."""

    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(80), index=True, nullable=True) # Supabase User UUID
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_hash_sha256 = Column(String(64), unique=True, index=True, nullable=True)
    mime_type = Column(String(60), nullable=False, default="application/octet-stream")
    file_size_bytes = Column(Integer, default=0)

    invoice_number = Column(String(80), index=True, nullable=True)
    vendor_name = Column(String(255), index=True, nullable=True)
    vendor_tax_id = Column(String(50), index=True, nullable=True) # NIT / RUT
    issue_date = Column(String(20), nullable=True)
    due_date = Column(String(20), nullable=True)
    currency = Column(String(10), default="COP")

    subtotal = Column(Float, nullable=True)
    tax_total = Column(Float, nullable=True)
    withholding_total = Column(Float, nullable=True, default=0.0)
    grand_total = Column(Float, nullable=True)

    extraction_method = Column(
        String(20), default="DETERMINISTIC"
    )  # DETERMINISTIC | TEMPLATE | OCR_LOCAL | AI_FALLBACK
    kono_state = Column(
        String(10), default=KonoState.GREEN.value, index=True
    )
    processing_status = Column(
        String(20), default="AUDITED"
    )  # PENDING | PROCESSING | AUDITED | APPROVED | REJECTED
    document_type = Column(String(20), default="INVOICE", index=True)  # INVOICE | RECEIPT | OTHER
    classifier_score = Column(Float, nullable=True)
    processing_time_ms = Column(Float, nullable=True)
    bounding_boxes = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship(
        "InvoiceItem", back_populates="document", cascade="all, delete-orphan"
    )
    discrepancies = relationship(
        "Discrepancy", back_populates="document", cascade="all, delete-orphan"
    )
    audit_logs = relationship(
        "AuditLog", back_populates="document", cascade="all, delete-orphan"
    )


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(String(36), primary_key=True, default=_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    line_number = Column(Integer, nullable=False)
    description = Column(String(255), default="")
    quantity = Column(Float, default=0.0)
    unit_price = Column(Float, default=0.0)
    tax_rate = Column(Float, nullable=True)
    total_price = Column(Float, default=0.0)
    is_math_valid = Column(Boolean, default=True)
    bbox_coordinates = Column(JSON, nullable=True)

    document = relationship("Document", back_populates="items")


class Discrepancy(Base):
    __tablename__ = "discrepancies"

    id = Column(String(36), primary_key=True, default=_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    field_name = Column(String(60), nullable=False)
    alert_type = Column(String(40), nullable=False)
    expected_value = Column(String(255), nullable=True)
    extracted_value = Column(String(255), nullable=True)
    delta_amount = Column(Float, nullable=True)
    description = Column(String(500), default="")

    document = relationship("Document", back_populates="discrepancies")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    user_id = Column(String(80), default="system")
    action = Column(String(40), default="AUTO_AUDIT")
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="audit_logs")


# Composite index used by the list endpoint (state + processing status).
Index("idx_documents_kono_status", Document.kono_state, Document.processing_status)
