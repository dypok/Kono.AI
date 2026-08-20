import pytest
from app.services.gmail_sync_service import GmailSyncService


def test_classify_empresa_from_vendor_name():
    service = GmailSyncService()
    empresa, tipo = service._classify_empresa_tipo(
        sender="billing@amazon.com",
        subject="Factura de compra #12345",
        vendor_name="Amazon Web Services S.A.S.",
    )
    assert empresa == "Amazon"
    assert tipo == "Debito"


def test_classify_empresa_from_sender_domain_when_no_vendor():
    service = GmailSyncService()
    empresa, tipo = service._classify_empresa_tipo(
        sender="notifications@mercadolibre.com.co",
        subject="Comprobante de compra",
        vendor_name=None,
    )
    assert empresa == "Mercadolibre"
    assert tipo == "Debito"


def test_classify_tipo_credito_for_credit_note():
    service = GmailSyncService()
    empresa, tipo = service._classify_empresa_tipo(
        sender="facturacion@claro.com.co",
        subject="Nota Crédito NC-99881 por devolución",
        vendor_name="Claro Comunicaciones",
    )
    assert empresa == "Claro"
    assert tipo == "Credito"


def test_build_hierarchical_gmail_label():
    service = GmailSyncService()
    label = service._build_label("Exito", "Debito")
    assert label == "KONO_INVOICE/Exito/Debito"

    label_nc = service._build_label("Falabella", "Credito")
    assert label_nc == "KONO_INVOICE/Falabella/Credito"
