import re
from typing import List, Optional, Tuple, Pattern
from app.schemas.spatial import SpatialWord, BoundingBox, ExtractedField

# Multiregional regex dictionary for financial anchor terms
ANCHOR_SYNONYMS = {
    "TOTAL": [
        r"total\s+a\s+pagar",
        r"gran\s+total",
        r"importe\s+total",
        r"valor\s+total",
        r"total\s+factura",
        r"total\s+general",
        r"total",
    ],
    "SUBTOTAL": [
        r"subtotal",
        r"sub-total",
        r"sub\s+total",
        r"base\s+imponible",
        r"valor\s+antes\s+de\s+iva",
        r"importe\s+neto",
        r"neto",
    ],
    "TAX": [
        r"iva\s*\(?\d+%\)?",
        r"iva",
        r"impuesto",
        r"vat",
        r"tax",
        r"igv",
    ],
    "INVOICE_NUMBER": [
        r"factura\s*n[°oº\.]*",
        r"factura\s*electr[oó]nica\s*de\s*venta",
        r"factura\s*electr[oó]nica",
        r"invoice\s*no[\.]*",
        r"folio",
        r"nro[\.]*\s*factura",
    ],
    "DATE": [
        r"fecha\s+de\s+emisi[oó]n",
        r"fecha\s+emisi[oó]n",
        r"fecha\s+de\s+expedici[oó]n",
        r"fecha\s+factura",
        r"fecha",
        r"date",
    ],
    "TAX_ID": [
        r"nit[\/:\s]*rut",
        r"nit[\/:\s]*",
        r"rut[\/:\s]*",
        r"rfc[\/:\s]*",
        r"cif[\/:\s]*",
        r"tax\s*id",
    ],
}

# Regex for financial numbers and dates
MONEY_PATTERN = re.compile(r"[\$€£]?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2}))")
DATE_PATTERN = re.compile(r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})")
TAX_ID_PATTERN = re.compile(r"(\d{8,12}(?:-\d)?)")
INVOICE_FOLIO_PATTERN = re.compile(r"([A-Z0-9]{2,10}(?:[-\s]?\d{1,10})+[.\-]?\d*)", re.IGNORECASE)

class SpatialEngine:
    """
    Deterministic Layout-Aware Parser using geometric Ray-Casting.
    Finds anchor text and projects horizontal and vertical search rays.
    """

    def __init__(self, words: List[SpatialWord]):
        self.words = sorted(words, key=lambda w: (w.page, w.bbox.y0, w.bbox.x0))

    def find_anchor(self, anchor_key: str) -> Optional[Tuple[str, BoundingBox]]:
        """Scans document words to locate anchor labels."""
        patterns = ANCHOR_SYNONYMS.get(anchor_key, [])
        combined_text = " ".join(w.text for w in self.words)

        for pat_str in patterns:
            pattern = re.compile(pat_str, re.IGNORECASE)
            # Check individual or adjacent words
            for i, word in enumerate(self.words):
                # Single word match
                if pattern.search(word.text):
                    return word.text, word.bbox

                # Multi-word phrase match (up to 4 consecutive words)
                for length in range(2, 5):
                    if i + length <= len(self.words):
                        phrase_words = self.words[i : i + length]
                        phrase = " ".join(w.text for w in phrase_words)
                        if pattern.search(phrase):
                            # Combined bounding box
                            merged_bbox = BoundingBox(
                                x0=min(w.bbox.x0 for w in phrase_words),
                                y0=min(w.bbox.y0 for w in phrase_words),
                                x1=max(w.bbox.x1 for w in phrase_words),
                                y1=max(w.bbox.y1 for w in phrase_words),
                            )
                            return phrase, merged_bbox
        return None

    def ray_cast_right(
        self,
        anchor_bbox: BoundingBox,
        regex_pattern: Pattern,
        y_tolerance: float = 14.0,
        max_distance_x: float = 300.0,
    ) -> Optional[ExtractedField]:
        """Projects a ray to the RIGHT of the anchor box within horizontal slice."""
        candidates = []
        for word in self.words:
            # Check if word is to the right
            if word.bbox.x0 >= anchor_bbox.x1:
                # Check vertical alignment (within tolerance of the center Y)
                if abs(word.bbox.center_y - anchor_bbox.center_y) <= y_tolerance:
                    distance = word.bbox.x0 - anchor_bbox.x1
                    if distance <= max_distance_x:
                        candidates.append((distance, word))

        # Sort closest first
        candidates.sort(key=lambda item: item[0])
        for _, word in candidates:
            match = regex_pattern.search(word.text)
            if match:
                return ExtractedField(
                    raw_value=word.text,
                    parsed_value=match.group(1) if match.groups() else word.text,
                    bbox=word.bbox,
                    confidence=0.98,
                )
        return None

    def ray_cast_below(
        self,
        anchor_bbox: BoundingBox,
        regex_pattern: Pattern,
        x_tolerance: float = 50.0,
        max_distance_y: float = 120.0,
    ) -> Optional[ExtractedField]:
        """Projects a ray BELOW the anchor box."""
        candidates = []
        for word in self.words:
            if word.bbox.y0 >= anchor_bbox.y1:
                if abs(word.bbox.center_x - anchor_bbox.center_x) <= x_tolerance:
                    distance = word.bbox.y0 - anchor_bbox.y1
                    if distance <= max_distance_y:
                        candidates.append((distance, word))

        candidates.sort(key=lambda item: item[0])
        for _, word in candidates:
            match = regex_pattern.search(word.text)
            if match:
                return ExtractedField(
                    raw_value=word.text,
                    parsed_value=match.group(1) if match.groups() else word.text,
                    bbox=word.bbox,
                    confidence=0.95,
                )
        return None

    def extract_field(
        self, anchor_key: str, value_type: str = "money"
    ) -> Optional[ExtractedField]:
        """Full Ray-Casting pipeline for a target financial field."""
        anchor_info = self.find_anchor(anchor_key)
        if not anchor_info:
            return None

        anchor_text, anchor_bbox = anchor_info

        pattern = MONEY_PATTERN
        if value_type == "date":
            pattern = DATE_PATTERN
        elif value_type == "tax_id":
            pattern = TAX_ID_PATTERN
        elif value_type == "invoice_number":
            pattern = INVOICE_FOLIO_PATTERN

        # 1. Try Ray-Casting Right First (standard for key-value pairs)
        result = self.ray_cast_right(anchor_bbox, pattern)
        if not result:
            # 2. Fallback to Ray-Casting Below (standard for stacked column layouts)
            result = self.ray_cast_below(anchor_bbox, pattern)

        if result:
            result.anchor_used = anchor_text

        return result
