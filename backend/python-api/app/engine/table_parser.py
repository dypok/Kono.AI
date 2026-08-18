import re
from typing import List, Optional, Tuple
from app.schemas.spatial import SpatialWord, BoundingBox
from app.schemas.items import ExtractedInvoiceItem, ExtractedTable

# Common table header keywords
HEADER_KEYWORDS = {
    "DESCRIPTION": [r"descripci[oó]n", r"concepto", r"detalle", r"item", r"producto", r"servicio"],
    "QUANTITY": [r"cant(?:idad)?", r"qty", r"unidades"],
    "UNIT_PRICE": [r"precio\s+unit(?:ario)?", r"val(?:or)?\s+unit(?:ario)?", r"p\.\s*unit", r"unit\s+price"],
    "TOTAL": [r"total", r"importe", r"valor\s+total", r"subtotal\s+l[ií]nea", r"total\s+l[ií]nea"],
}

NUMERIC_CLEAN_PATTERN = re.compile(r"[^\d.,\-]")

def parse_financial_number(text: str) -> Optional[float]:
    """Cleans currency symbols and converts standard formatted numbers to float."""
    cleaned = NUMERIC_CLEAN_PATTERN.sub("", text).strip()
    if not cleaned:
        return None
    
    # Handle European/LatAm vs US standard formatting (e.g. 1.500,00 vs 1,500.00)
    if "." in cleaned and "," in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            # 1.500,00 -> 1500.00
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            # 1,500.00 -> 1500.00
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned and "." not in cleaned:
        # Check if comma is decimal (e.g. 50,00)
        parts = cleaned.split(",")
        if len(parts) == 2 and len(parts[1]) == 2:
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
            
    try:
        return float(cleaned)
    except ValueError:
        return None

class DeterministicTableParser:
    """
    Parses line items from spatial words by:
    1. Detecting table header boundary.
    2. Detecting totals section footer boundary.
    3. Grouping words into horizontal rows based on Y-coordinate clustering.
    4. Segregating columns (Description, Quantity, Unit Price, Line Total).
    """

    def __init__(self, words: List[SpatialWord]):
        self.words = sorted(words, key=lambda w: (w.page, w.bbox.y0, w.bbox.x0))

    def find_header_top_and_bottom(self) -> Tuple[Optional[float], Optional[float]]:
        """Finds the Y-boundaries of the table column header."""
        for i, word in enumerate(self.words):
            for pattern_list in HEADER_KEYWORDS.values():
                for pat in pattern_list:
                    if re.search(pat, word.text, re.IGNORECASE):
                        # Found a header word, estimate header row range
                        header_top = word.bbox.y0
                        header_bottom = word.bbox.y1 + 10.0
                        return header_top, header_bottom
        return None, None

    def find_totals_section_top(self) -> float:
        """Finds where the table ends and the summary/totals section begins."""
        totals_anchors = [r"^subtotal", r"^total\s+a\s+pagar", r"^iva", r"^gran\s+total", r"^total"]
        for word in self.words:
            for pat in totals_anchors:
                if re.search(pat, word.text, re.IGNORECASE):
                    return word.bbox.y0
        return 99999.0 # End of document

    def parse_items(self, page_num: int = 1) -> ExtractedTable:
        page_words = [w for w in self.words if w.page == page_num]
        if not page_words:
            return ExtractedTable()

        header_top, header_bottom = self.find_header_top_and_bottom()
        totals_top = self.find_totals_section_top()

        if header_bottom is None:
            # Fallback default table boundaries if no explicit header found
            header_bottom = 120.0

        # Filter words inside the table area
        table_words = [
            w for w in page_words 
            if w.bbox.y0 >= header_bottom and w.bbox.y1 <= totals_top
        ]

        if not table_words:
            return ExtractedTable()

        # Group words by similar Y-coordinate (horizontal rows with ~8px threshold)
        rows: List[List[SpatialWord]] = []
        current_row: List[SpatialWord] = []
        current_y = -1.0

        for word in sorted(table_words, key=lambda w: (w.bbox.y0, w.bbox.x0)):
            if current_y < 0:
                current_y = word.bbox.center_y
                current_row.append(word)
            elif abs(word.bbox.center_y - current_y) <= 8.0:
                current_row.append(word)
            else:
                if current_row:
                    rows.append(sorted(current_row, key=lambda w: w.bbox.x0))
                current_row = [word]
                current_y = word.bbox.center_y

        if current_row:
            rows.append(sorted(current_row, key=lambda w: w.bbox.x0))

        # Build ExtractedInvoiceItem from each row
        items: List[ExtractedInvoiceItem] = []
        calculated_subtotal = 0.0
        line_no = 1

        for row in rows:
            if len(row) < 2:
                continue # Skip stray single words

            # Identify numbers vs text in row
            text_tokens = []
            number_tokens = []

            for word in row:
                parsed_num = parse_financial_number(word.text)
                if parsed_num is not None and not bool(re.search(r"[a-zA-Z]{3,}", word.text)):
                    number_tokens.append((parsed_num, word))
                else:
                    text_tokens.append(word.text)

            description = " ".join(text_tokens).strip()

            # Typically a line has: [Description] [Quantity] [UnitPrice] [LineTotal]
            if len(number_tokens) >= 3:
                # 3 numbers: Qty, UnitPrice, LineTotal
                qty = number_tokens[0][0]
                unit_price = number_tokens[1][0]
                total = number_tokens[2][0]
            elif len(number_tokens) == 2:
                # 2 numbers: Qty, LineTotal (derive UnitPrice) or UnitPrice, LineTotal
                qty = number_tokens[0][0]
                total = number_tokens[1][0]
                unit_price = total / qty if qty > 0 else total
            elif len(number_tokens) == 1:
                qty = 1.0
                total = number_tokens[0][0]
                unit_price = total
            else:
                continue

            if not description and len(number_tokens) == 0:
                continue

            # Row Bounding Box
            row_bbox = BoundingBox(
                x0=min(w.bbox.x0 for w in row),
                y0=min(w.bbox.y0 for w in row),
                x1=max(w.bbox.x1 for w in row),
                y1=max(w.bbox.y1 for w in row),
            )

            # Mathematical sanity check on line item
            expected_total = qty * unit_price
            is_valid = abs(expected_total - total) <= 0.05

            item = ExtractedInvoiceItem(
                line_number=line_no,
                description=description if description else f"Item {line_no}",
                quantity=qty,
                unit_price=unit_price,
                total_price=total,
                bbox=row_bbox,
                is_math_valid=is_valid,
            )
            items.append(item)
            calculated_subtotal += total
            line_no += 1

        return ExtractedTable(
            items=items,
            subtotal_calculated=round(calculated_subtotal, 2)
        )
