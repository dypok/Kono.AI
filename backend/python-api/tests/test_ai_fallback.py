from types import SimpleNamespace

from app.engine.ai_fallback import AiFallback, KonoInvoiceSchema
from app.schemas.audit import ExtractedInvoice
from app.schemas.items import ExtractedInvoiceItem


class FakeChoices:
    def __init__(self, content: str):
        self.message = SimpleNamespace(content=content)


class FakeResponse:
    def __init__(self, content: str):
        self.choices = [FakeChoices(content)]


class FakeCompletions:
    def __init__(self, canned: str):
        self._canned = canned

    def create(self, **kwargs):
        # Capture what was sent for assertions.
        self.sent = kwargs
        return FakeResponse(self._canned)


class FakeChat:
    def __init__(self, canned: str):
        self.completions = FakeCompletions(canned)


class FakeClient:
    def __init__(self, canned: str):
        self.chat = FakeChat(canned)


def make_invoice():
    return ExtractedInvoice(
        document_id="doc-1",
        invoice_number="INV-2026-999",
        items=[
            ExtractedInvoiceItem(line_number=1, description="X", quantity=1.0, unit_price=10.0, total_price=10.0),
        ],
        parsed_subtotal=10.0,
        parsed_tax_total=1.9,
        parsed_total=None,  # missing -> triggers fallback
    )


def test_build_prompt_mentions_conflicting_fields():
    fb = AiFallback()
    prompt = fb.build_prompt(make_invoice(), ["total"])
    assert "total" in prompt["user"]
    assert len(prompt["user"]) < 800  # keep token-light


def test_request_fallback_returns_none_without_client():
    fb = AiFallback()
    result = fb.request_fallback(make_invoice(), ["total"])
    assert result is None  # deterministic-only mode


def test_request_fallback_parses_structured_json():
    canned = '{"total": 11.9, "tax_total": 1.9}'
    client = FakeClient(canned)
    fb = AiFallback(client)
    result = fb.request_fallback(make_invoice(), ["total"])
    assert isinstance(result, KonoInvoiceSchema)
    assert result.total == 11.9
    assert result.tax_total == 1.9
    # Assert structured output was requested (token/cost safety).
    assert client.chat.completions.sent["response_format"] == {"type": "json_object"}
    assert client.chat.completions.sent["temperature"] == 0


def test_request_fallback_handles_bad_json():
    client = FakeClient("not-json{")
    fb = AiFallback(client)
    result = fb.request_fallback(make_invoice(), ["total"])
    assert result is None  # graceful degradation, never crashes


def test_request_fallback_limits_tokens():
    client = FakeClient('{"total": 1.0}')
    fb = AiFallback(client)
    fb.request_fallback(make_invoice(), ["total"])
    assert client.chat.completions.sent["max_tokens"] <= 400
    assert client.chat.completions.sent["model"] == "gpt-4o-mini"
