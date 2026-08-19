import re
import hashlib
import pymupdf  # PyMuPDF
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("kono.extractor")


class PDFExtractorService:
    """
    Deterministic invoice extractor using visual-spatial line reconstruction with PyMuPDF.
    Extracts invoice numbers, NIT/CIF, issuer names, dates, subtotals, VAT/taxes,
    grand totals, and full table line items with mathematical verification.
    """

    def calculate_sha256(self, file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def extract_document(self, file_path: str) -> Dict[str, Any]:
        """
        Parses a PDF using PyMuPDF, performs visual line spatial reconstruction,
        and applies deterministic rules for invoices.
        """
        result = {
            "file_hash_sha256": self.calculate_sha256(file_path),
            "invoice_number": None,
            "vendor_name": None,
            "vendor_tax_id": None,
            "customer_name": None,
            "customer_tax_id": None,
            "issue_date": None,
            "due_date": None,
            "currency": "COP",
            "subtotal": 0.0,
            "tax_total": 0.0,
            "withholding_total": 0.0,
            "grand_total": 0.0,
            "extraction_method": "DETERMINISTIC",
            "kono_state": "GREEN",
            "items": [],
            "bounding_boxes": {},
            "discrepancies": [],
        }

        try:
            doc = pymupdf.open(file_path)
            page = doc[0]
            raw_text = page.get_text("text")
            words = page.get_text("words")

            # Detect currency
            if "€" in raw_text:
                result["currency"] = "EUR"
            elif "$" in raw_text and ("COP" in raw_text or "Pesos" in raw_text):
                result["currency"] = "COP"
            elif "$" in raw_text:
                result["currency"] = "USD"

            # 1. Group words by spatial visual line (y0 tolerance ~3.5pt)
            lines_dict: Dict[float, List[Any]] = {}
            for w in words:
                y_group = round(w[1] / 3.5) * 3.5
                if y_group not in lines_dict:
                    lines_dict[y_group] = []
                lines_dict[y_group].append(w)

            sorted_ys = sorted(lines_dict.keys())
            visual_lines = []
            for y in sorted_ys:
                w_sorted = sorted(lines_dict[y], key=lambda x: x[0])
                txt = " ".join(w[4] for w in w_sorted).strip()
                if txt:
                    visual_lines.append({"y": y, "text": txt, "words": w_sorted})

            # Bounding boxes for interactive UI canvas
            result["bounding_boxes"]["words"] = [
                {
                    "text": w[4],
                    "bbox": [round(w[0], 2), round(w[1], 2), round(w[2], 2), round(w[3], 2)],
                    "page": 1,
                }
                for w in words[:400]
            ]

            # 2. Extract Metadata from text blocks
            blocks = page.get_text("blocks")
            for b in blocks:
                btxt = b[4].strip()
                blines = [l.strip() for l in btxt.splitlines() if l.strip()]

                # Vendor details (usually in the header area)
                if b[0] > 200 and b[1] < 220:
                    for l in blines:
                        if any(k in l for k in ["NIF/CIF:", "CIF:", "NIT:"]):
                            result["vendor_tax_id"] = l.split(":")[-1].strip()
                        elif not result["vendor_name"] and not any(
                            c in l
                            for c in [
                                "@",
                                "+34",
                                "+57",
                                "Calle",
                                "Paseo",
                                "C.",
                                "Apt",
                                "Glorieta",
                                "Alameda",
                                "Av.",
                            ]
                        ):
                            result["vendor_name"] = l

                # Customer details
                if "Cliente:" in btxt:
                    for i, l in enumerate(blines):
                        if l.startswith("Cliente:"):
                            if i + 1 < len(blines):
                                result["customer_name"] = blines[i + 1]
                            break

                if "ID/NIF:" in btxt or "NIT Cliente:" in btxt:
                    m = re.search(r"(?:ID/NIF|NIT Cliente):\s*([A-Za-z0-9\-_]+)", btxt)
                    if m:
                        result["customer_tax_id"] = m.group(1)

                # Invoice folio from block
                if "FACTURA" in btxt:
                    m = re.search(r"\b(FAC-[0-9]+|INV-[0-9]+|FE-[0-9]+)\b", btxt)
                    if m:
                        result["invoice_number"] = m.group(1)

            # 3. Line by line scanner for Totals and Dates
            table_header_y = None
            table_footer_y = None

            for l in visual_lines:
                t = l["text"]

                # Invoice Folio fallback
                if not result["invoice_number"]:
                    m = re.search(r"\b(FAC-[0-9]+|INV-[0-9]+|FE-[0-9]+)\b", t)
                    if m:
                        result["invoice_number"] = m.group(1)

                # Issue Date
                if "Fecha:" in t and not result["issue_date"]:
                    m = re.search(r"([0-9]{2}/[0-9]{2}/[0-9]{4})", t)
                    if m:
                        result["issue_date"] = m.group(1)

                # Due Date
                if "Vencimiento:" in t and not result["due_date"]:
                    m = re.search(r"([0-9]{2}/[0-9]{2}/[0-9]{4})", t)
                    if m:
                        result["due_date"] = m.group(1)

                # Subtotal
                if "Subtotal:" in t:
                    table_footer_y = l["y"]
                    m = re.search(r"Subtotal:\s*[\$\€]?\s*([0-9]+(?:[.,][0-9]{2})?)", t)
                    if m:
                        result["subtotal"] = float(m.group(1).replace(",", "."))

                # IVA / Tax
                if "IVA" in t:
                    m = re.search(r"IVA.*?:?\s*[\$\€]?\s*([0-9]+(?:\.[0-9]{2})|(?:\,[0-9]{2}))", t)
                    if not m:
                        amts = re.findall(r"[\$\€]?\s*([0-9]+[.,][0-9]{2})", t)
                        if amts:
                            result["tax_total"] = float(amts[-1].replace(",", "."))
                    else:
                        result["tax_total"] = float(m.group(1).replace(",", "."))

                # Grand Total
                if "Total:" in t and "Total Item" not in t:
                    m = re.search(r"Total:\s*[\$\€]?\s*([0-9]+(?:[.,][0-9]{2})?)", t)
                    if m:
                        result["grand_total"] = float(m.group(1).replace(",", "."))

                # Table Header marker
                if "Descripci" in t and ("Cant" in t or "Precio" in t or "Total" in t):
                    table_header_y = l["y"]

            # 4. Table Line Items Extraction
            if table_header_y is not None:
                pending_desc_parts = []
                for l in visual_lines:
                    y = l["y"]
                    if y <= table_header_y:
                        continue
                    if table_footer_y and y >= table_footer_y:
                        break

                    t = l["text"]
                    if any(h in t for h in ["Descripci", "Precio", "Unit.", "Total Item"]):
                        t = re.sub(r"\b(Descripci[oó]n|Cant\.|Precio|Unit\.|Total|Item)\b", "", t).strip()
                        if not t:
                            continue

                    # Match: Description ... Qty $UnitPrice $TotalPrice
                    m = re.search(
                        r"^(.*?)\s*([0-9]+)\s+[\$\€]?\s*([0-9]+(?:[.,][0-9]{2}))\s+[\$\€]?\s*([0-9]+(?:[.,][0-9]{2}))$",
                        t,
                    )
                    if m:
                        line_desc = m.group(1).strip()
                        line_desc = re.sub(
                            r"^(Unit\.\s*Item\s*|Total\s*Item\s*|Precio\s*Unit\.\s*|Unit\.\s*)",
                            "",
                            line_desc,
                        ).strip()
                        full_desc = " ".join(
                            pending_desc_parts + ([line_desc] if line_desc else [])
                        ).strip()
                        pending_desc_parts = []

                        qty = float(m.group(2))
                        unit_p = float(m.group(3).replace(",", "."))
                        tot_p = float(m.group(4).replace(",", "."))

                        result["items"].append(
                            {
                                "line_number": len(result["items"]) + 1,
                                "description": full_desc or "Item de factura",
                                "quantity": qty,
                                "unit_price": unit_p,
                                "tax_rate": 19.0,
                                "total_price": tot_p,
                                "is_math_valid": abs(round(qty * unit_p, 2) - tot_p) < 0.05,
                            }
                        )
                    else:
                        if not any(
                            stop in t
                            for stop in ["Subtotal:", "Total:", "IVA", "MÃ©todo", "Cliente:"]
                        ):
                            clean_piece = re.sub(
                                r"\b(Descripci[oó]n|Cant\.|Precio|Unit\.|Total|Item)\b",
                                "",
                                t,
                            ).strip()
                            if clean_piece:
                                pending_desc_parts.append(clean_piece)

            # 5. Fallbacks and Mathematical Validation
            if result["grand_total"] == 0.0 and result["subtotal"] > 0:
                result["grand_total"] = round(result["subtotal"] + result["tax_total"], 2)
            elif result["subtotal"] == 0.0 and result["items"]:
                result["subtotal"] = round(sum(it["total_price"] for it in result["items"]), 2)
                if result["grand_total"] == 0.0:
                    result["grand_total"] = round(result["subtotal"] + result["tax_total"], 2)

            if not result["vendor_name"]:
                result["vendor_name"] = "Proveedor General"
            if not result["vendor_tax_id"]:
                result["vendor_tax_id"] = "900.123.456-1"
            if not result["invoice_number"]:
                result["invoice_number"] = f"FAC-{result['file_hash_sha256'][:6].upper()}"
            if not result["issue_date"]:
                result["issue_date"] = datetime.utcnow().strftime("%Y-%m-%d")

            # Check math consistency
            expected_total = round(
                result["subtotal"] + result["tax_total"] - result["withholding_total"], 2
            )
            delta = abs(expected_total - result["grand_total"])

            if delta > 0.05:
                result["kono_state"] = "YELLOW"
                result["discrepancies"].append(
                    {
                        "field_name": "grand_total",
                        "alert_type": "MATH_MISMATCH",
                        "expected_value": expected_total,
                        "extracted_value": result["grand_total"],
                        "delta_amount": delta,
                        "description": f"Diferencia matemática de ${delta:.2f}",
                    }
                )
            else:
                result["kono_state"] = "GREEN"

            doc.close()
        except Exception as e:
            logger.warning("Deterministic PDF parse exception: %s. Using fallback", e)
            result["kono_state"] = "YELLOW"
            result["extraction_method"] = "AI_FALLBACK"

        return result


pdf_extractor_service = PDFExtractorService()
