import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger("kono.knowledge")

# Fallback hardcoded values (backward compatible) if JSON missing/corrupt
_FALLBACK_ANCHORS: Dict[str, List[str]] = {
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

_FALLBACK_HEADERS: Dict[str, List[str]] = {
    "DESCRIPTION": [r"descripci[oó]n", r"concepto", r"detalle", r"item", r"producto", r"servicio"],
    "QUANTITY": [r"cant(?:idad)?", r"qty", r"unidades"],
    "UNIT_PRICE": [r"precio\s+unit(?:ario)?", r"val(?:or)?\s+unit(?:ario)?", r"p\.\s*unit", r"unit\s+price"],
    "TOTAL": [r"total", r"importe", r"valor\s+total", r"subtotal\s+l[ií]nea", r"total\s+l[ií]nea"],
}


def _knowledge_path() -> Path:
    # app/engine/knowledge_loader.py -> app/engine/knowledge_base.json
    return Path(__file__).parent / "knowledge_base.json"


@lru_cache(maxsize=1)
def load_knowledge_base() -> Dict:
    """Load and cache the JSON knowledge base. No recompilation needed to add synonyms."""
    path = _knowledge_path()
    try:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                logger.info("knowledge_base loaded from %s", path)
                return data
        logger.warning("knowledge_base not found at %s, using fallback", path)
    except Exception as exc:  # noqa: BLE001
        logger.warning("failed to load knowledge_base (%s), using fallback: %s", path, exc)
    return {"anchors": _FALLBACK_ANCHORS, "header_keywords": _FALLBACK_HEADERS}


def get_anchors() -> Dict[str, List[str]]:
    kb = load_knowledge_base()
    # New JSON may use "anchors" key; fallback to old structure
    anchors = kb.get("anchors") or kb.get("ANCHOR_SYNONYMS") or _FALLBACK_ANCHORS
    # Ensure we return a dict; merge fallback for missing keys to keep backward compat
    merged = dict(_FALLBACK_ANCHORS)
    merged.update(anchors)
    return merged


def get_header_keywords() -> Dict[str, List[str]]:
    kb = load_knowledge_base()
    headers = kb.get("header_keywords") or kb.get("HEADER_KEYWORDS") or _FALLBACK_HEADERS
    merged = dict(_FALLBACK_HEADERS)
    merged.update(headers)
    return merged


def reload_knowledge_base() -> None:
    """Clear cache to reload after JSON edits (useful in tests)."""
    load_knowledge_base.cache_clear()
