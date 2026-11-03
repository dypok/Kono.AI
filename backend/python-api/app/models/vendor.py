import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, JSON, Text

from app.core.database import Base


class VendorTemplate(Base):
    """
    Learned spatial coordinates and anchors for recurring vendors.
    Enables instant (< 2ms) zero-token deterministic extraction.
    """
    __tablename__ = "vendor_templates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor_tax_id = Column(String(50), unique=True, index=True, nullable=False) # NIT / RUT
    vendor_name = Column(String(255), nullable=True)
    spatial_anchors = Column(JSON, nullable=False) # Dictionary of field bounding boxes and anchor offsets
    total_matched_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
