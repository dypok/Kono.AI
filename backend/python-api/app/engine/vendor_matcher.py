import re
from typing import List, Optional, Dict, Any
from app.schemas.spatial import SpatialWord, BoundingBox, ExtractedField
from app.schemas.template import VendorTemplateSchema, FieldAnchorRule, ExtractedInvoicePayload
from app.engine.spatial_engine import SpatialEngine, MONEY_PATTERN, DATE_PATTERN, INVOICE_FOLIO_PATTERN
from app.engine.table_parser import parse_financial_number

class VendorTemplateMatcher:
    """
    Handles:
    1. Direct coordinate-based extraction when a vendor template is known.
    2. Auto-generation and calibration of templates when user confirms/corrects fields.
    """

    def __init__(self, words: List[SpatialWord]):
        self.words = words
        self.spatial_engine = SpatialEngine(words)

    def extract_with_template(
        self, template: VendorTemplateSchema
    ) -> ExtractedInvoicePayload:
        """
        Instant (< 2ms) deterministic extraction using predefined anchor offsets and bounding boxes.
        """
        payload = ExtractedInvoicePayload(
            vendor_tax_id=template.vendor_tax_id,
            vendor_name=template.vendor_name,
            extraction_method="TEMPLATE",
            confidence_score=0.99,
        )

        # Apply rules for each field defined in template
        for field_name, rule in template.spatial_anchors.items():
            extracted: Optional[ExtractedField] = None

            if rule.expected_bbox:
                # 1. Direct bounding box query
                matched_words = [
                    w for w in self.words
                    if abs(w.bbox.center_x - rule.expected_bbox.center_x) <= 30.0
                    and abs(w.bbox.center_y - rule.expected_bbox.center_y) <= 15.0
                ]
                if matched_words:
                    val_text = " ".join(w.text for w in matched_words)
                    extracted = ExtractedField(
                        raw_value=val_text,
                        parsed_value=val_text,
                        bbox=rule.expected_bbox,
                        confidence=1.0,
                    )

            if not extracted:
                # 2. Fallback to anchor rule offset
                val_type = "money" if "total" in field_name or "tax" in field_name else "text"
                if "date" in field_name:
                    val_type = "date"
                elif "number" in field_name or "invoice" in field_name:
                    val_type = "invoice_number"
                
                extracted = self.spatial_engine.extract_field(field_name.upper(), value_type=val_type)

            if extracted:
                payload.bounding_boxes[field_name] = extracted.bbox.dict() if extracted.bbox else None
                if field_name == "grand_total":
                    payload.grand_total = parse_financial_number(extracted.raw_value)
                elif field_name == "subtotal":
                    payload.subtotal = parse_financial_number(extracted.raw_value)
                elif field_name == "tax_total":
                    payload.tax_total = parse_financial_number(extracted.raw_value)
                elif field_name == "invoice_number":
                    payload.invoice_number = extracted.parsed_value
                elif field_name == "issue_date":
                    payload.issue_date = extracted.parsed_value

        return payload

    @staticmethod
    def build_template_from_corrections(
        vendor_tax_id: str,
        vendor_name: str,
        fields_with_bboxes: Dict[str, Dict[str, Any]],
    ) -> VendorTemplateSchema:
        """
        Creates a new VendorTemplateSchema from user's manual correction or verified invoice.
        """
        anchors = {}
        for field_name, data in fields_with_bboxes.items():
            bbox_data = data.get("bbox")
            bbox = BoundingBox(**bbox_data) if bbox_data else None
            anchors[field_name] = FieldAnchorRule(
                anchor_text=data.get("anchor", field_name.upper()),
                direction=data.get("direction", "right"),
                expected_bbox=bbox,
            )

        return VendorTemplateSchema(
            vendor_tax_id=vendor_tax_id,
            vendor_name=vendor_name,
            spatial_anchors=anchors,
            total_matched_count=1,
        )
