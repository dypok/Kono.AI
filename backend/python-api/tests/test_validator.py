import pytest

from app.engine.validator import DeterministicValidator
from app.schemas.audit import ExtractedInvoice, KonoState
from app.schemas.items import ExtractedInvoiceItem


def make_invoice(**overrides):
    base = dict(
        document_id="doc-1",
        file_hash="aaa" * 21,
        issue_date="2026-08-18",
        supplier_name="Acme SA",
        tax_id="900123456-8",
        invoice_number="INV-2026-001",
        items=[
            ExtractedInvoiceItem(
                line_number=1,
                description="Servidor Cloud",
                quantity=1.0,
                unit_price=500.0,
                total_price=500.0,
            ),
            ExtractedInvoiceItem(
                line_number=2,
                description="Almacenamiento NVMe",
                quantity=2.0,
                unit_price=100.0,
                total_price=200.0,
            ),
        ],
        parsed_subtotal=700.0,
        parsed_tax_total=133.0,       # 19% of 700
        parsed_withholding_total=0.0,
        parsed_total=833.0,           # 700 + 133 - 0
        confidence_score=1.0,
    )
    base.update(overrides)
    return ExtractedInvoice(**base)


@pytest.fixture
def validator():
    return DeterministicValidator()


def test_green_when_math_exact(validator):
    result = validator.validate_invoice(make_invoice())
    assert result.kono_state == KonoState.GREEN
    assert result.calculated_subtotal == 700.0
    assert result.calculated_total == 833.0
    assert abs(result.subtotal_delta) <= 0.02
    assert abs(result.total_delta) <= 0.02
    assert not result.needs_ai_fallback


def test_green_within_rounding_tolerance(validator):
    # Declared total off by 0.01 (within ±0.02 tolerance) -> still GREEN.
    result = validator.validate_invoice(make_invoice(parsed_total=833.01))
    assert result.kono_state == KonoState.GREEN


def test_yellow_when_total_mismatch_over_tolerance(validator):
    # Declared total off by 0.05 (> 0.02) -> YELLOW.
    inv = make_invoice(parsed_total=833.05)
    result = validator.validate_invoice(inv)
    assert result.kono_state == KonoState.YELLOW
    assert abs(result.total_delta) > 0.02
    assert any(d.field == "total" for d in result.discrepancies)


def test_yellow_on_item_math_mismatch(validator):
    # One line total does not equal qty * unit price.
    inv = make_invoice(
        items=[
            ExtractedInvoiceItem(line_number=1, description="A", quantity=2.0, unit_price=10.0, total_price=25.0),
        ],
        parsed_subtotal=25.0, parsed_total=25.0, parsed_tax_total=0.0,
    )
    result = validator.validate_invoice(inv)
    assert result.kono_state == KonoState.YELLOW
    assert any(d.kind.value == "ITEM_TOTAL_MISMATCH" for d in result.discrepancies)


def test_yellow_on_low_confidence(validator):
    inv = make_invoice(confidence_score=0.5)  # < 0.80
    result = validator.validate_invoice(inv)
    assert result.kono_state == KonoState.YELLOW
    assert result.needs_ai_fallback is True  # score < 0.70 → AI fallback


def test_yellow_on_invalid_tax_id(validator):
    inv = make_invoice(tax_id="123")  # too short -> invalid
    result = validator.validate_invoice(inv)
    assert result.kono_state == KonoState.YELLOW
    assert any(d.kind.value == "INVALID_TAX_ID" for d in result.discrepancies)


def test_red_on_duplicate_hash(validator):
    inv = make_invoice(
        file_hash="dup-trigger",
        items=[],
        parsed_subtotal=0.0, parsed_tax_total=0.0, parsed_total=0.0,
    )
    # Simulate a duplicate detected upstream (e.g. already in the hash set).
    result = validator.validate_invoice(inv)
    # A duplicate is registered by the pipeline as DUPLICATE_HASH before calling.
    # We assert the validator flags RED when that discrepancy is present.
    from app.schemas.audit import Discrepancy, DiscrepancyKind
    result.discrepancies.append(
        Discrepancy(
            field="file_hash",
            kind=DiscrepancyKind.DUPLICATE_HASH,
            message="duplicate SHA-256 detected",
        )
    )
    state = validator._assign_kono_state(inv, result.discrepancies)
    assert state == KonoState.RED


def test_valid_tax_id_check_digit(validator):
    # NIT 900123456 has DV 8 by the Colombian modulo-11 check-digit rule.
    assert validator.is_valid_tax_id("900123456-8") is True


def test_invalid_tax_id_check_digit(validator):
    assert validator.is_valid_tax_id("900123456-7") is False


def test_summarize(validator):
    result = validator.validate_invoice(make_invoice())
    text = validator.summarize(result)
    assert "GREEN" in text
