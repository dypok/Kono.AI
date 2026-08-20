import re
from enum import Enum
from typing import Dict, List, Tuple

from app.engine.knowledge_loader import get_anchors
from app.schemas.spatial import SpatialWord


class DocumentType(str, Enum):
    INVOICE = "INVOICE"
    RECEIPT = "RECEIPT"
    OTHER = "OTHER"


# Weights for anchor groups - financial anchors weigh more than generic
ANCHOR_WEIGHTS: Dict[str, float] = {
    "DOCUMENT_TYPE": 3.0,
    "TOTAL": 2.5,
    "INVOICE_NUMBER": 2.5,
    "TAX_ID": 2.0,
    "SUBTOTAL": 1.5,
    "TAX": 1.5,
    "DATE": 1.0,
    "SUPPLIER": 1.0,
    "CUSTOMER": 0.5,
}

# Minimum score to be considered an invoice
INVOICE_THRESHOLD = 0.35
RECEIPT_THRESHOLD = 0.20


class DocumentClassifier:
    """
    Deterministic document classifier that scores a document's words
    against the knowledge base of invoice anchors.

    It does NOT modify extraction logic when the document IS an invoice;
    it only adds a `document_type` signal to avoid fabricating data for
    non-invoices (US-REQ-001).
    Reuses the JSON knowledge base (US-REQ-004) so adding synonyms
    requires no recompilation.
    """

    def __init__(self):
        self.anchors = get_anchors()

    def classify(self, words: List[SpatialWord]) -> Tuple[DocumentType, float, List[str]]:
        """
        Returns (document_type, score 0..1, matched_anchor_keys).
        Score is weighted matched anchors / max possible weighted score.
        """
        if not words:
            return DocumentType.OTHER, 0.0, []

        full_text = " ".join(w.text for w in words)
        if not full_text.strip():
            return DocumentType.OTHER, 0.0, []

        matched: List[str] = []
        weighted_score = 0.0
        max_score = sum(ANCHOR_WEIGHTS.values())

        for key, weight in ANCHOR_WEIGHTS.items():
            patterns = self.anchors.get(key, [])
            if self._matches_any(full_text, patterns):
                matched.append(key)
                weighted_score += weight

        # Also check document_type_keywords for receipt vs invoice distinction
        score = weighted_score / max_score if max_score > 0 else 0.0

        # Decision logic: prioritize invoice detection
        if score >= INVOICE_THRESHOLD and any(k in matched for k in ["TOTAL", "INVOICE_NUMBER", "DOCUMENT_TYPE"]):
            # Need at least one strong financial anchor + document type or total
            return DocumentType.INVOICE, round(score, 4), matched

        # Check for receipt: has receipt keywords but not enough for invoice
        receipt_keywords = self.anchors.get("DOCUMENT_TYPE", [])
        has_receipt = any(re.search(p, full_text, re.IGNORECASE) for p in receipt_keywords if "recibo" in p.lower() or "receipt" in p.lower())
        # Also consider if it has some financial anchors but below invoice threshold
        if has_receipt and score >= RECEIPT_THRESHOLD:
            return DocumentType.RECEIPT, round(score, 4), matched

        if score >= RECEIPT_THRESHOLD and len(matched) >= 2:
            # Weak financial document -> receipt
            return DocumentType.RECEIPT, round(score, 4), matched

        return DocumentType.OTHER, round(score, 4), matched

    @staticmethod
    def _matches_any(text: str, patterns: List[str]) -> bool:
        for pat in patterns:
            try:
                if re.search(pat, text, re.IGNORECASE):
                    return True
            except re.error:
                # Fallback to simple substring if regex is malformed
                if pat.lower() in text.lower():
                    return True
        return False

    def is_invoice(self, words: List[SpatialWord]) -> bool:
        doc_type, _, _ = self.classify(words)
        return doc_type == DocumentType.INVOICE
