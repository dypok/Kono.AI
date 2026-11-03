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

            # 🔓 Auto PDF Unlocker: Automatic Password Decryptor for Encrypted Invoices
            if doc.is_encrypted:
                logger.info("Encrypted PDF detected at %s. Running Auto PDF Unlocker...", file_path)
                unlocked = False

                # Common heuristics for financial invoice passwords (tax IDs, clean pass, dates, user NIT)
                candidate_passwords = [
                    "",                    # Empty / default permissions
                    "900123456",           # Standard generic company NIT
                    "900.123.456",
                    "123456789",
                    "1234",
                    "0000",
                    datetime.utcnow().strftime("%Y"),  # Current year
                ]

                for pwd in candidate_passwords:
                    auth_res = doc.authenticate(pwd)
                    if auth_res > 0:
                        logger.info("✅ PDF unlocked successfully with candidate password.")
                        unlocked = True
                        # Save decrypted version to file_path to allow previewing without password prompt
                        try:
                            decrypted_data = doc.tobytes(garbage=4, deflate=True)
                            with open(file_path, "wb") as f_out:
                                f_out.write(decrypted_data)
                            doc.close()
                            doc = pymupdf.open(file_path)
                        except Exception as save_err:
                            logger.warning("Could not persist decrypted bytes: %s", save_err)
                        break

                if not unlocked:
                    logger.warning("Could not auto-decrypt PDF %s with standard heuristics.", file_path)
                    result["kono_state"] = "RED"
                    result["discrepancies"].append({
                        "field_name": "pdf_encryption",
                        "alert_type": "PASSWORD_PROTECTED",
                        "description": "PDF protegido por contraseña del proveedor.",
                    })
                    doc.close()
                    return result

            page = doc[0]
            raw_text = page.get_text("text")
            words = page.get_text("words")

            # Detect currency
            from app.services.currency_service import currency_service

            is_cop = "COP" in raw_text or "Pesos" in raw_text or "NIT:" in raw_text or "DIAN" in raw_text or "IVA (19%)" in raw_text
            if "€" in raw_text or "EUR" in raw_text:
                result["currency"] = "EUR"
            elif "USD" in raw_text or "$" in raw_text and not is_cop or "TAX ID:" in raw_text or "INVOICE" in raw_text.upper() and not is_cop:
                result["currency"] = "USD"
            elif "$" in raw_text or is_cop:
                result["currency"] = "COP"
            else:
                result["currency"] = "COP"

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

                # Vendor details (in top area y0 < 150)
                if b[1] < 150 and not any(k in btxt.upper() for k in ["BILL TO", "SHIP TO", "CUSTOMER", "CLIENTE", "DESCRIPTION", "DESCRIPCI"]):
                    for l in blines:
                        if any(k in l.upper() for k in ["NIF/CIF:", "CIF:", "NIT:", "TAX ID:", "VAT ID:", "EIN:", "VAT:"]):
                            m_nit = re.search(r"(?:NIT|CIF|NIF|TAX\s*ID|VAT\s*ID|EIN|VAT)[:\s]*([A-Z0-9.\-]+)", l, re.IGNORECASE)
                            if m_nit and not result["vendor_tax_id"]:
                                result["vendor_tax_id"] = m_nit.group(1).strip()
                        elif not result["vendor_name"] and not any(
                            c in l.upper()
                            for c in [
                                "@",
                                "+34",
                                "+57",
                                "+1",
                                "CALLE",
                                "CARRERA",
                                "AVENIDA",
                                "PASEO",
                                "STREET",
                                "AVENUE",
                                "SUITE",
                                "BLVD",
                                "ROAD",
                                "CRA ",
                                "CL ",
                                "C/ ",
                                "APT ",
                                "DIRECCIÓN",
                                "DIRECCION",
                                "ADDRESS",
                                "FACTURA",
                                "INVOICE",
                                "BILL TO",
                                "SHIP TO",
                                "N°:",
                                "NÚMERO",
                                "NUMBER",
                                "FECHA",
                                "DATE",
                                "CLIENTE",
                                "CUSTOMER",
                                "DESCRIPTION",
                                "DESCRIPCI",
                                "AMOUNT",
                                "PRICE",
                                "QTY",
                                "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
                                "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
                                "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
                                "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
                            ]
                        ) and not re.search(r"\b[0-9]{4,5}\b", l) and len(l.strip()) > 2:
                            result["vendor_name"] = l.strip()

                # Customer details (Spanish / English)
                if any(k in btxt.upper() for k in ["CLIENTE", "BILL TO", "CUSTOMER", "SOLD TO"]):
                    for i, l in enumerate(blines):
                        if any(k in l.upper() for k in ["CLIENTE", "BILL TO", "CUSTOMER", "SOLD TO"]):
                            c_name = re.sub(r"^(?:CLIENTE|BILL\s+TO|CUSTOMER|SOLD\s+TO)\s*(?:/\s*ADQUIRIENTE)?:\s*", "", l, flags=re.IGNORECASE).strip()
                            if c_name:
                                result["customer_name"] = c_name
                            elif i + 1 < len(blines):
                                result["customer_name"] = blines[i + 1].strip()
                            break

                if any(k in btxt.upper() for k in ["ID/NIF:", "NIT CLIENTE:", "CUSTOMER TAX ID:", "TAX ID:"]) or ("NIT:" in btxt and b[1] >= 140 and b[1] <= 240):
                    m = re.search(r"(?:ID/NIF|NIT Cliente|Customer Tax ID|Tax ID|NIT):\s*([A-Z0-9.\-]+)", btxt, re.IGNORECASE)
                    if m and not result["customer_tax_id"]:
                        result["customer_tax_id"] = m.group(1).strip()

                # Invoice folio from block
                if any(k in btxt.upper() for k in ["FACTURA", "INVOICE", "BILL", "RECEIPT", "FOLIO"]):
                    # Check for "Invoice number VMPKFDAE-0001" or typical prefixes
                    m_inv = re.search(r"(?:INVOICE\s+NUMBER|FACTURA(?:\s+N[°ºO\.]*)?|FOLIO)[:\s]*([A-Z0-9\-_]{3,30})\b", btxt, re.IGNORECASE)
                    if m_inv:
                        cand = m_inv.group(1).strip()
                        if cand.upper() not in ["NUMBER", "DATE", "OF"]:
                            result["invoice_number"] = cand

                    if not result["invoice_number"]:
                        m_pref = re.search(r"\b((?:FAC|INV|FE|FEV|NC|ND|SETP|SETT|BILL)(?:[-_][0-9A-Z]+)+)\b", btxt, re.IGNORECASE)
                        if m_pref:
                            result["invoice_number"] = m_pref.group(1).upper()
                        else:
                            m = re.search(r"(?:FACTURA(?:\s+ELECTR[OÓ]NICA)?(?:\s+DE\s+VENTA)?|INVOICE|BILL|RECEIPT|FOLIO|N[°ºO\.]*)[\s:#]*([A-Z0-9\-_]{3,30})\b", btxt, re.IGNORECASE)
                            if m:
                                candidate = m.group(1).strip()
                                if candidate.upper() not in ["ELECTRONICA", "VENTA", "NUMBER", "DATE", "CLIENTE", "CUSTOMER", "TECHNOLOGIES", "ICA", "DE", "OF", "ISSUE", "DUE"]:
                                    result["invoice_number"] = candidate

            # 3. Line by line scanner for Totals and Dates
            table_header_y = None
            table_footer_y = None

            for l in visual_lines:
                t = l["text"]

                # Invoice Folio fallback
                if not result["invoice_number"]:
                    m_inv = re.search(r"(?:INVOICE\s+NUMBER|FACTURA(?:\s+N[°ºO\.]*)?|FOLIO)[:\s]*([A-Z0-9\-_]{3,30})\b", t, re.IGNORECASE)
                    if m_inv:
                        cand = m_inv.group(1).strip()
                        if cand.upper() not in ["NUMBER", "DATE", "OF"]:
                            result["invoice_number"] = cand

                if not result["invoice_number"]:
                    m_pref = re.search(r"\b((?:FAC|INV|FE|FEV|NC|ND|SETP|SETT|BILL)(?:[-_][0-9A-Z]+)+)\b", t, re.IGNORECASE)
                    if m_pref:
                        result["invoice_number"] = m_pref.group(1).upper()
                    else:
                        m = re.search(r"(?:FACTURA(?:\s+ELECTR[OÓ]NICA)?(?:\s+DE\s+VENTA)?|INVOICE|BILL|RECEIPT|FOLIO|N[°ºO\.]*)[\s:#]*([A-Z0-9\-_]{3,30})\b", t, re.IGNORECASE)
                        if m:
                            candidate = m.group(1).strip()
                            if candidate.upper() not in ["ELECTRONICA", "VENTA", "NUMBER", "DATE", "CLIENTE", "CUSTOMER", "TECHNOLOGIES", "ICA", "DE", "OF", "ISSUE", "DUE"]:
                                result["invoice_number"] = candidate

                # Issue Date (Spanish / English / ISO / Slash / Month text like 'July 17, 2026')
                if any(k in t.upper() for k in ["FECHA", "EMISIÓN", "EMISION", "ISSUE DATE", "DATE OF ISSUE", "INVOICE DATE", "BILLING DATE", "DATE:"]) and not result["issue_date"]:
                    m = re.search(r"([0-9]{2}/[0-9]{2}/[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}-[0-9]{2}-[0-9]{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+[0-9]{1,2},?\s+[0-9]{4})", t, re.IGNORECASE)
                    if m:
                        result["issue_date"] = m.group(1)

                # Due Date (Spanish / English / Month text like 'July 17, 2026')
                if any(k in t.upper() for k in ["VENCIMIENTO", "VENCE", "DUE DATE", "DATE DUE", "PAYMENT DUE"]) and not result["due_date"]:
                    m = re.search(r"([0-9]{2}/[0-9]{2}/[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}-[0-9]{2}-[0-9]{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+[0-9]{1,2},?\s+[0-9]{4})", t, re.IGNORECASE)
                    if m:
                        result["due_date"] = m.group(1)

                # Subtotal (Spanish / English)
                if any(k in t.upper() for k in ["SUBTOTAL", "SUB-TOTAL", "NET AMOUNT", "BASE IMPONIBLE"]):
                    table_footer_y = l["y"]
                    m = re.search(r"(?:SUBTOTAL|SUB-TOTAL|NET AMOUNT|BASE IMPONIBLE)[:\s]*[\$\€\£]?\s*([0-9.,]+)", t, re.IGNORECASE)
                    if m:
                        val_str = m.group(1).replace(".", "").replace(",", ".") if "," in m.group(1) and "." in m.group(1) else m.group(1).replace(",", "")
                        try:
                            result["subtotal"] = float(val_str)
                        except ValueError:
                            pass

                # IVA / Tax / VAT / GST
                if any(k in t.upper() for k in ["IVA", "VAT", "TAX", "GST", "SALES TAX", "IMPUESTO"]):
                    m = re.search(r"(?:IVA|VAT|TAX|GST|SALES TAX|IMPUESTO)(?:\s*\([0-9]+%\))?[:\s]*[\$\€\£]?\s*([0-9.,]+)", t, re.IGNORECASE)
                    if m:
                        val_str = m.group(1).replace(".", "").replace(",", ".") if "," in m.group(1) and "." in m.group(1) else m.group(1).replace(",", "")
                        try:
                            result["tax_total"] = float(val_str)
                        except ValueError:
                            pass

                # Grand Total (Spanish: Total / Total a Pagar; English: Amount Due / Total Due / Balance Due / Total Amount)
                if any(k in t.upper() for k in ["TOTAL", "AMOUNT DUE", "TOTAL DUE", "BALANCE DUE", "AMOUNT PAYABLE", "TOTAL AMOUNT", "TOTAL A PAGAR"]) and "TOTAL ITEM" not in t.upper() and "UNIT" not in t.upper():
                    m = re.search(r"(?:TOTAL A PAGAR|AMOUNT DUE|TOTAL DUE|BALANCE DUE|AMOUNT PAYABLE|TOTAL AMOUNT|TOTAL)[:\s]*[\$\€\£]?\s*([0-9.,]+)", t, re.IGNORECASE)
                    if m:
                        val_str = m.group(1).replace(".", "").replace(",", ".") if "," in m.group(1) and "." in m.group(1) else m.group(1).replace(",", "")
                        try:
                            result["grand_total"] = float(val_str)
                        except ValueError:
                            pass

                # Table Header marker (Spanish / English) - capture only the first header
                if table_header_y is None and any(k in t.upper() for k in ["DESCRIPCI", "DESCRIPTION"]) and any(k in t.upper() for k in ["CANT", "QTY", "QUANTITY", "PRECIO", "PRICE", "RATE", "VALOR", "AMOUNT"]):
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
                    if any(h in t for h in ["Descripci", "Description", "Precio", "Price", "Unit.", "Total Item", "Amount", "Rate"]):
                        t = re.sub(r"\b(Descripci[oó]n|Description|Cant\.|Qty|Quantity|Precio|Price|Rate|Unit\.|Total|Item|Amount)\b", "", t, flags=re.IGNORECASE).strip()
                        if not t:
                            continue

                    # Match: Description ... Qty $UnitPrice $TotalPrice (supporting varied currency formats)
                    m = re.search(
                        r"^(.*?)\s*([0-9]+(?:\.[0-9]+)?)\s+(?:USD|COP|EUR|\$|\€|\£)?\s*([0-9]+(?:[.,][0-9]{2}))\s+(?:USD|COP|EUR|\$|\€|\£)?\s*([0-9]+(?:[.,][0-9]{2}))$",
                        t,
                    )
                    if m:
                        line_desc = m.group(1).strip()
                        line_desc = re.sub(
                            r"^(Unit\.\s*Item\s*|Total\s*Item\s*|Precio\s*Unit\.\s*|Unit\.\s*|Rate\s*)",
                            "",
                            line_desc,
                            flags=re.IGNORECASE,
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
                            for stop in ["Subtotal", "Total", "Amount Due", "IVA", "VAT", "Tax", "Método", "Cliente", "Customer"]
                        ):
                            clean_piece = re.sub(
                                r"\b(Descripci[oó]n|Description|Cant\.|Qty|Precio|Price|Unit\.|Total|Item)\b",
                                "",
                                t,
                                flags=re.IGNORECASE,
                            ).strip()
                            if clean_piece:
                                pending_desc_parts.append(clean_piece)

            # 5. Classify document type before fabricating (US-REQ-001)
            try:
                from app.engine.document_classifier import DocumentClassifier, DocumentType
                from app.schemas.spatial import BoundingBox, SpatialWord

                classifier_words = []
                for w in words:
                    try:
                        classifier_words.append(
                            SpatialWord(
                                text=str(w[4]),
                                bbox=BoundingBox(x0=float(w[0]), y0=float(w[1]), x1=float(w[2]), y1=float(w[3])),
                                page=1,
                                confidence=1.0,
                            )
                        )
                    except Exception:
                        continue
                _classifier = DocumentClassifier()
                _doc_type, _score, _anchors = _classifier.classify(classifier_words)
                result["document_type"] = _doc_type.value
                result["classifier_score"] = _score
                result["matched_anchors"] = _anchors
                is_other_pdf = _doc_type == DocumentType.OTHER
            except Exception as _cls_err:
                logger.warning("Classifier failed, defaulting to INVOICE: %s", _cls_err)
                result["document_type"] = "INVOICE"
                result["classifier_score"] = 0.5
                is_other_pdf = False

            # 6. Mathematical Consistency Check (including Discounts and Withholdings)
            discount_total = 0.0
            for l in visual_lines:
                t_disc = l["text"]
                if any(k in t_disc.upper() for k in ["DISCOUNT", "OFF", "DESCUENTO", "REBAJA"]):
                    m_d = re.search(r"[-–]\s*[\$\€\£]?\s*([0-9.,]+)", t_disc)
                    if m_d:
                        try:
                            d_val = float(m_d.group(1).replace(",", "."))
                            discount_total += d_val
                        except ValueError:
                            pass

            if result["grand_total"] == 0.0 and result["subtotal"] > 0:
                result["grand_total"] = round(result["subtotal"] + result["tax_total"] - discount_total, 2)
            elif result["subtotal"] == 0.0 and result["items"]:
                result["subtotal"] = round(sum(it["total_price"] for it in result["items"]), 2)
                if result["grand_total"] == 0.0:
                    result["grand_total"] = round(result["subtotal"] + result["tax_total"] - discount_total, 2)

            # Check math consistency
            expected_total = round(
                result["subtotal"] + result["tax_total"] - result["withholding_total"] - discount_total, 2
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

            # 7. Automatic USD -> COP Currency Conversion
            if result.get("currency") == "USD":
                rate = currency_service.get_current_rate_sync()
                result["original_currency"] = "USD"
                result["original_grand_total"] = result["grand_total"]
                result["original_subtotal"] = result["subtotal"]
                result["original_tax_total"] = result["tax_total"]
                result["exchange_rate_cop"] = rate

                # Convert primary accounting totals to COP
                result["subtotal_cop"] = round((result["subtotal"] or 0.0) * rate, 2)
                result["tax_total_cop"] = round((result["tax_total"] or 0.0) * rate, 2)
                result["grand_total_cop"] = round((result["grand_total"] or 0.0) * rate, 2)

                # Store conversion details in metadata
                if "bounding_boxes" not in result or not isinstance(result["bounding_boxes"], dict):
                    result["bounding_boxes"] = {}
                result["bounding_boxes"]["conversion"] = {
                    "original_currency": "USD",
                    "original_total_usd": result["original_grand_total"],
                    "exchange_rate_cop": rate,
                    "converted_total_cop": result["grand_total_cop"],
                }

            doc.close()
        except Exception as e:
            logger.warning("Deterministic PDF parse exception: %s. Using fallback", e)
            result["kono_state"] = "YELLOW"
            result["extraction_method"] = "AI_FALLBACK"

        return result


pdf_extractor_service = PDFExtractorService()
