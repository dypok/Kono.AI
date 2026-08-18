from app.schemas.spatial import SpatialWord, BoundingBox
from app.schemas.template import VendorTemplateSchema, FieldAnchorRule
from app.engine.vendor_matcher import VendorTemplateMatcher

def test_extract_with_known_template():
    words = [
        SpatialWord(text="Factura", bbox=BoundingBox(x0=50.0, y0=50.0, x1=100.0, y1=65.0)),
        SpatialWord(text="INV-2026-999", bbox=BoundingBox(x0=120.0, y0=50.0, x1=200.0, y1=65.0)),
        SpatialWord(text="Total:", bbox=BoundingBox(x0=350.0, y0=500.0, x1=400.0, y1=515.0)),
        SpatialWord(text="$2,450.00", bbox=BoundingBox(x0=420.0, y0=500.0, x1=490.0, y1=515.0)),
    ]

    # Predefined learned template for vendor '900.111.222-3'
    template = VendorTemplateSchema(
        vendor_tax_id="900.111.222-3",
        vendor_name="AWS Cloud Services",
        spatial_anchors={
            "invoice_number": FieldAnchorRule(
                anchor_text="Factura",
                direction="right",
                expected_bbox=BoundingBox(x0=120.0, y0=50.0, x1=200.0, y1=65.0),
            ),
            "grand_total": FieldAnchorRule(
                anchor_text="Total:",
                direction="right",
                expected_bbox=BoundingBox(x0=420.0, y0=500.0, x1=490.0, y1=515.0),
            ),
        },
    )

    matcher = VendorTemplateMatcher(words)
    payload = matcher.extract_with_template(template)

    assert payload.extraction_method == "TEMPLATE"
    assert payload.confidence_score == 0.99
    assert payload.invoice_number == "INV-2026-999"
    assert payload.grand_total == 2450.0
