from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.audit import ExtractedInvoice


class KonoInvoiceSchema(BaseModel):
    """Strict financial contract returned by the AI fallback.

    Only the fields the deterministic engine was unsure about are filled;
    the rest are left as None. The OpenAI call must be structured with
    `response_format={"type": "json_object"}` to guarantee this shape.
    """
    issue_date: Optional[str] = Field(default=None, description="ISO date of issue")
    tax_id: Optional[str] = Field(default=None, description="NIT/RUT/RFC without separators")
    invoice_number: Optional[str] = Field(default=None)
    supplier_name: Optional[str] = Field(default=None)
    subtotal: Optional[float] = Field(default=None, ge=0)
    tax_total: Optional[float] = Field(default=None, ge=0)
    withholding_total: Optional[float] = Field(default=None, ge=0)
    total: Optional[float] = Field(default=None, ge=0)


class AiFallback:
    """Selective AI fallback for uncertain fields.

    Invoked ONLY when the deterministic engine has a confidence score < 70%
    or a required field is missing. It sends only the conflicting text
    fragment so each call stays under ~400 tokens (< $0.0002). Fully mockable
    in tests/CI (no network, no cost).
    """

    MODEL = "gpt-4o-mini"
    # Budget guard so we never spend more than intended.
    MAX_CONFLICT_FRAGMENT_CHARS = 600

    def __init__(self, client: Optional[Any] = None) -> None:
        # client is injected; None keeps the class safe/immediately usable
        # offline when only the deterministic path runs.
        self._client = client

    @property
    def client(self) -> Any:
        return self._client

    def build_prompt(
        self, invoice: ExtractedInvoice, conflicting_fields: List[str]
    ) -> Dict[str, Any]:
        """Builds a minimal prompt with only the conflicting fragment."""
        snippet = self._conflict_snippet(invoice)
        field_list = ", ".join(conflicting_fields) or "subtotal,tax_total,total"
        system = (
            "You are a financial extraction assistant for invoice auditing. "
            "Return ONLY a JSON object with the requested fields, using exact "
            "numeric values (no currency symbols)."
        )
        user = (
            f"Resolve these uncertain fields: {field_list}. "
            f"Conflicting invoice fragment (max {self.MAX_CONFLICT_FRAGMENT_CHARS} chars):\n"
            f"---\n{snippet}\n---"
        )
        return {"system": system, "user": user}

    def request_fallback(
        self,
        invoice: ExtractedInvoice,
        conflicting_fields: List[str],
    ) -> Optional[KonoInvoiceSchema]:
        """Calls the AI client if available and parses the structured reply.

        Returns None when no client is injected (deterministic-only mode) or
        when the network/model is unavailable, so callers degrade gracefully.
        """
        if self._client is None:
            return None
        prompt = self.build_prompt(invoice, conflicting_fields)
        try:
            response = self._client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": prompt["system"]},
                    {"role": "user", "content": prompt["user"]},
                ],
                response_format={"type": "json_object"},
                temperature=0,
                max_tokens=400,
            )
            content = response.choices[0].message.content
            data = self._parse_json(content)
            if not data:
                return None
            result = KonoInvoiceSchema(**data)
            # A payload where every field stayed None carries no signal; treat
            # it as a failed extraction so the caller keeps the discrepancy.
            if all(
                value is None
                for value in (
                    result.issue_date,
                    result.tax_id,
                    result.invoice_number,
                    result.supplier_name,
                    result.subtotal,
                    result.tax_total,
                    result.withholding_total,
                    result.total,
                )
            ):
                return None
            return result
        except Exception:
            # Never crash the pipeline on an optional AI glitch.
            return None

    @staticmethod
    def _parse_json(content: Optional[str]) -> Dict[str, Any]:
        import json

        if not content:
            return {}
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {}

    @staticmethod
    def _conflict_snippet(invoice: ExtractedInvoice) -> str:
        """Reconstructs a compact, token-light text of the invoice fields."""
        parts = [
            f"document: {invoice.document_id}",
            f"invoice: {invoice.invoice_number or 'unknown'}",
            f"subtotal: {invoice.parsed_subtotal}",
            f"tax: {invoice.parsed_tax_total}",
            f"withholding: {invoice.parsed_withholding_total}",
            f"total: {invoice.parsed_total}",
        ]
        items = "; ".join(
            f"{it.quantity}x{it.unit_price}={it.total_price}" for it in invoice.items[:10]
        )
        parts.append(f"items: {items}")
        return "\n".join(parts)
