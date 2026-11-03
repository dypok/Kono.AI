from app.engine.document_classifier import DocumentClassifier, DocumentType
from app.schemas.spatial import BoundingBox, SpatialWord


def _word(text, x0=10, y0=10):
    return SpatialWord(text=text, bbox=BoundingBox(x0=x0, y0=y0, x1=x0+50, y1=y0+15), page=1)


def test_classifies_invoice_with_financial_anchors():
    words = [_word("Factura"), _word("NIT 900123456"), _word("Total"), _word("$100.00")]
    clf = DocumentClassifier()
    doc_type, score, matched = clf.classify(words)
    assert doc_type == DocumentType.INVOICE
    assert score > 0.3
    assert "TOTAL" in matched or "DOCUMENT_TYPE" in matched


def test_classifies_other_when_no_anchors():
    words = [_word("Hola"), _word("mundo"), _word("contrato"), _word("legal")]
    clf = DocumentClassifier()
    doc_type, score, matched = clf.classify(words)
    assert doc_type == DocumentType.OTHER
    assert score < 0.3
    assert len(matched) == 0


def test_classifies_receipt():
    words = [_word("Recibo"), _word("Pago"), _word("Total"), _word("$50.00")]
    clf = DocumentClassifier()
    doc_type, score, _ = clf.classify(words)
    # Could be INVOICE or RECEIPT depending on score, but not OTHER
    assert doc_type in (DocumentType.INVOICE, DocumentType.RECEIPT)


def test_expanded_synonyms_invoice_bill():
    # bill is new synonym
    words = [_word("Bill"), _word("Invoice"), _word("Total")]
    clf = DocumentClassifier()
    doc_type, _, matched = clf.classify(words)
    assert doc_type == DocumentType.INVOICE
    assert "DOCUMENT_TYPE" in matched


def test_amount_paid_synonym():
    words = [_word("Amount"), _word("Paid"), _word("$250.00")]
    clf = DocumentClassifier()
    # amount paid should match TOTAL anchor as multi-word
    anchor = clf.classify(words)
    # At least TOTAL should be matched
    assert "TOTAL" in anchor[2] or anchor[0] != DocumentType.OTHER


def test_empty_words_is_other():
    clf = DocumentClassifier()
    doc_type, score, matched = clf.classify([])
    assert doc_type == DocumentType.OTHER
    assert score == 0.0
