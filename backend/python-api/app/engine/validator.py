import re
from typing import List, Optional, Tuple

from app.schemas.audit import (
    AuditResult,
    Discrepancy,
    DiscrepancyKind,
    ExtractedInvoice,
    KonoState,
)


class DeterministicValidator:
    """Deterministic financial audit engine.

    Implements the arithmetic validation of an invoice with a rounding
    tolerance of ±0.02, the fiscal tax-id check digit algorithm, and the
    assignment of the Kono mascot state (GREEN / YELLOW / RED).

    Everything here is pure and offline: no network calls, no AI. The
    selective AI fallback lives in `ai_fallback.py` and is only triggered
    when `needs_ai_fallback` is True (see `AuditResult`).
    """

    ROUNDING_TOLERANCE = 0.02
    CONFIDENCE_THRESHOLD = 0.70   # below this, consider AI fallback
    LOW_READ_CONFIDENCE = 0.80    # reading confidence below this flags YELLOW

    # ------------------------------------------------------------------ #
    # Entry point
    # ------------------------------------------------------------------ #
    def validate_invoice(self, invoice: ExtractedInvoice) -> AuditResult:
        discrepancies: List[Discrepancy] = []

        # 1. Recompute subtotal from line items.
        calculated_subtotal = round(sum(i.quantity * i.unit_price for i in invoice.items), 2)

        # 2. Item-level math sanity (line total = qty * unit price).
        for item in invoice.items:
            expected = round(item.quantity * item.unit_price, 2)
            if abs(expected - item.total_price) > self.ROUNDING_TOLERANCE:
                discrepancies.append(
                    Discrepancy(
                        field=f"item[{item.line_number}].total",
                        kind=DiscrepancyKind.ITEM_TOTAL_MISMATCH,
                        expected=expected,
                        extracted=item.total_price,
                        delta=round(expected - item.total_price, 4),
                        message=(
                            f"line {item.line_number} total {item.total_price} != "
                            f"qty*unit {expected}"
                        ),
                    )
                )

        # 3. Subtotal delta vs the parsed/declared subtotal.
        sub_delta = 0.0
        if invoice.parsed_subtotal is not None:
            sub_delta = round(calculated_subtotal - invoice.parsed_subtotal, 2)
            if abs(sub_delta) > self.ROUNDING_TOLERANCE:
                discrepancies.append(
                    Discrepancy(
                        field="subtotal",
                        kind=DiscrepancyKind.SUBTOTAL_MISMATCH,
                        expected=calculated_subtotal,
                        extracted=invoice.parsed_subtotal,
                        delta=sub_delta,
                        message=f"subtotal sum {calculated_subtotal} != declared {invoice.parsed_subtotal}",
                    )
                )

        # 4. Total = subtotal + tax - withholding.
        tax_total = invoice.parsed_tax_total or 0.0
        withholding_total = invoice.parsed_withholding_total or 0.0
        calc_total = round(calculated_subtotal + tax_total - withholding_total, 2)
        total_delta = 0.0
        if invoice.parsed_total is not None:
            total_delta = round(calc_total - invoice.parsed_total, 2)
            if abs(total_delta) > self.ROUNDING_TOLERANCE:
                discrepancies.append(
                    Discrepancy(
                        field="total",
                        kind=DiscrepancyKind.TOTAL_MISMATCH,
                        expected=calc_total,
                        extracted=invoice.parsed_total,
                        delta=total_delta,
                        message=(
                            f"subtotal+tax-withholding {calc_total} != declared "
                            f"{invoice.parsed_total}"
                        ),
                    )
                )

        # 5. Tax-id validation (check digit). Missing/empty tax id is treated
        #    as an invalid-tax-id discrepancy (it blocks GREEN).
        tax_id_ok = True
        if invoice.tax_id:
            tax_id_ok = self.is_valid_tax_id(invoice.tax_id)
        else:
            tax_id_ok = False
            discrepancies.append(
                Discrepancy(
                    field="tax_id",
                    kind=DiscrepancyKind.MISSING_FIELD,
                    message="tax id (NIT/RUT) not provided",
                )
            )
        if invoice.tax_id and not tax_id_ok:
            discrepancies.append(
                Discrepancy(
                    field="tax_id",
                    kind=DiscrepancyKind.INVALID_TAX_ID,
                    extracted=None,
                    message=f"invalid tax id check digit: {invoice.tax_id}",
                )
            )

        # 6. Reading confidence.
        low_confidence = invoice.confidence_score < self.LOW_READ_CONFIDENCE
        if low_confidence:
            discrepancies.append(
                Discrepancy(
                    field="confidence",
                    kind=DiscrepancyKind.LOW_CONFIDENCE,
                    expected=self.LOW_READ_CONFIDENCE,
                    extracted=invoice.confidence_score,
                    delta=round(invoice.confidence_score - self.LOW_READ_CONFIDENCE, 4),
                    message=f"reading confidence {invoice.confidence_score:.2f} < {self.LOW_READ_CONFIDENCE:.2f}",
                )
            )

        # 7. Confidence score for the deterministic engine (0..1). Start from
        #    the reading confidence and penalize each block by 0.2 (max 0).
        score = invoice.confidence_score
        if discrepancy_count := len(discrepancies):
            score = max(0.0, score - 0.2 * discrepancy_count)

        # 8. Assign Kono state by severity.
        state = self._assign_kono_state(invoice, discrepancies)

        return AuditResult(
            kono_state=state,
            calculated_subtotal=calculated_subtotal,
            extracted_subtotal=invoice.parsed_subtotal,
            calculated_total=calc_total,
            extracted_total=invoice.parsed_total,
            tax_total=tax_total,
            withholding_total=withholding_total,
            confidence_score=round(score, 4),
            discrepancies=discrepancies,
            needs_ai_fallback=score < self.CONFIDENCE_THRESHOLD,
            subtotal_delta=sub_delta,
            total_delta=total_delta,
        )

    # ------------------------------------------------------------------ #
    # State assignment
    # ------------------------------------------------------------------ #
    def _assign_kono_state(
        self, invoice: ExtractedInvoice, discrepancies: List[Discrepancy]
    ) -> KonoState:
        kinds = {d.kind for d in discrepancies}
        # RED: duplicate detected (hash or invoice number already used).
        if DiscrepancyKind.DUPLICATE_HASH in kinds or DiscrepancyKind.DUPLICATE_INVOICE_NUMBER in kinds:
            return KonoState.RED
        # YELLOW: any money mismatch, item discrepancy or low confidence.
        if (
            DiscrepancyKind.SUBTOTAL_MISMATCH in kinds
            or DiscrepancyKind.TOTAL_MISMATCH in kinds
            or DiscrepancyKind.ITEM_TOTAL_MISMATCH in kinds
            or DiscrepancyKind.LOW_CONFIDENCE in kinds
            or invoice.confidence_score < self.LOW_READ_CONFIDENCE
        ):
            return KonoState.YELLOW
        # Missing or invalid tax id blocks GREEN.
        if DiscrepancyKind.MISSING_FIELD in kinds or DiscrepancyKind.INVALID_TAX_ID in kinds:
            return KonoState.YELLOW
        # GREEN: everything checks out.
        return KonoState.GREEN

    # ------------------------------------------------------------------ #
    # Tax-id (NIT) check digit — Colombian modulo-11 algorithm
    # ------------------------------------------------------------------ #
    def is_valid_tax_id(self, tax_id: str) -> bool:
        """Validates a NIT/RUT using the Colombian modulo-11 check digit.

        The weights descend from 71: `[71,67,59,53,47,43,41,37,29,23,19,17,13,7,3]`
        and are applied from RIGHT to LEFT over the base digits (the final
        check digit is excluded). residual -> 0 => DV 0; 1 => DV 9; else 11 - r.
        """
        digits = [int(c) for c in tax_id if c.isdigit()]
        if len(digits) < 4:
            return False
        digit_check = digits[-1]
        base = digits[:-1]

        weights = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3]
        total = 0
        for i, d in enumerate(reversed(base)):
            total += d * weights[i % len(weights)]
        remainder = total % 11
        if remainder == 0:
            expected = 0
        elif remainder == 1:
            expected = 9
        else:
            expected = 11 - remainder
        return digit_check == expected

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def summarize(self, result: AuditResult) -> str:
        return (
            f"state={result.kono_state.value} sub={result.calculated_subtotal} "
            f"total={result.calculated_total} conf={result.confidence_score:.2f} "
            f"deltas(sub={result.subtotal_delta},total={result.total_delta}) "
            f"issues={len(result.discrepancies)}"
        )
