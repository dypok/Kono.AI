import json
import tempfile
from pathlib import Path


def test_load_knowledge_base_has_expanded_synonyms():
    from app.engine.knowledge_loader import get_anchors, get_header_keywords

    anchors = get_anchors()
    headers = get_header_keywords()

    # Backward compatible: old keys still present
    assert "TOTAL" in anchors
    assert "SUBTOTAL" in anchors
    assert "DESCRIPTION" in headers

    # New synonyms from US-REQ-004
    total_patterns = " ".join(anchors["TOTAL"]).lower()
    assert "amount paid" in total_patterns or "amount\\s+paid" in total_patterns
    assert "total paid" in total_patterns or "total\\s+paid" in total_patterns

    doc_type = anchors.get("DOCUMENT_TYPE", [])
    doc_text = " ".join(doc_type).lower()
    assert "invoice" in doc_text or "factura" in doc_text


def test_spatial_engine_detects_new_synonyms():
    from app.schemas.spatial import BoundingBox, SpatialWord
    from app.engine.spatial_engine import SpatialEngine

    words = [
        SpatialWord(text="Invoice", bbox=BoundingBox(x0=10, y0=10, x1=80, y1=20)),
        SpatialWord(text="TOTAL", bbox=BoundingBox(x0=10, y0=50, x1=60, y1=65)),
        SpatialWord(text="$100.00", bbox=BoundingBox(x0=70, y0=50, x1=130, y1=65)),
    ]
    engine = SpatialEngine(words)
    # DOCUMENT_TYPE should be detectable now
    anchor = engine.find_anchor("DOCUMENT_TYPE")
    assert anchor is not None
    assert "invoice" in anchor[0].lower()


def test_amount_paid_anchor_detected():
    from app.schemas.spatial import BoundingBox, SpatialWord
    from app.engine.spatial_engine import SpatialEngine

    words = [
        SpatialWord(text="Amount", bbox=BoundingBox(x0=10, y0=10, x1=60, y1=20)),
        SpatialWord(text="Paid", bbox=BoundingBox(x0=65, y0=10, x1=100, y1=20)),
        SpatialWord(text="$250.00", bbox=BoundingBox(x0=110, y0=10, x1=170, y1=20)),
    ]
    engine = SpatialEngine(words)
    anchor = engine.find_anchor("TOTAL")
    # Should match "amount paid" as a multi-word anchor
    assert anchor is not None


def test_header_keywords_expandable_without_recompile(monkeypatch, tmp_path):
    """Simulate adding a synonym to JSON and reloading."""
    from app.engine import knowledge_loader

    # Create a temporary knowledge_base with an extra header synonym
    kb = {
        "anchors": {"TOTAL": [r"total", r"my_custom_total_anchor_xyz"]},
        "header_keywords": {"DESCRIPTION": [r"descripci[oó]n", r"my_header_xyz"]},
    }
    tmp_file = tmp_path / "knowledge_base.json"
    tmp_file.write_text(json.dumps(kb), encoding="utf-8")

    # Patch the path resolver
    monkeypatch.setattr(knowledge_loader, "_knowledge_path", lambda: tmp_file)
    knowledge_loader.reload_knowledge_base()

    try:
        anchors = knowledge_loader.get_anchors()
        headers = knowledge_loader.get_header_keywords()
        assert any("my_custom_total_anchor_xyz" in p for p in anchors["TOTAL"])
        assert any("my_header_xyz" in p for p in headers["DESCRIPTION"])
    finally:
        knowledge_loader.reload_knowledge_base()
        # Restore original path
        monkeypatch.undo()
        knowledge_loader.reload_knowledge_base()
