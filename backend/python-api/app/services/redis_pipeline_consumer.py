import asyncio
import json
import logging
import uuid
from typing import Dict, Any, List
from pathlib import Path
from datetime import datetime
import redis.asyncio as aioredis
from sqlalchemy.future import select

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, init_engine
from app.models.document import Document, InvoiceItem, Discrepancy
from app.schemas.spatial import SpatialWord, BoundingBox
from app.schemas.items import ExtractedInvoiceItem
from app.schemas.audit import ExtractedInvoice
from app.engine.spatial_engine import SpatialEngine
from app.engine.table_parser import DeterministicTableParser
from app.engine.validator import DeterministicValidator

logger = logging.getLogger("kono.redis_consumer")


class RedisPipelineConsumer:
    """
    Consumes extracted document geometric words from Rust Core via Redis Stream
    (`invoice_processing_stream` & `invoice_inbound_stream`), applying the
    Python Ray-Casting SpatialEngine and DeterministicTableParser, persisting the
    reconciled invoice and broadcasting to WebSockets.
    """

    def __init__(self):
        self._running = False
        self._task: asyncio.Task | None = None

    async def _process_rust_payload(self, raw_data: Dict[str, Any], ws_manager=None):
        settings = get_settings()
        file_path = raw_data.get("file_path", "")
        file_hash = raw_data.get("file_hash", "")
        words_data = raw_data.get("words", [])
        doc_id = raw_data.get("document_id") or str(uuid.uuid4())

        file_name = Path(file_path).name if file_path else f"{doc_id}.pdf"
        file_size = raw_data.get("file_size_bytes", 0)

        # 1. Convert words to SpatialWord objects
        spatial_words: List[SpatialWord] = []
        for w in words_data:
            bbox_raw = w.get("bbox", [0, 0, 0, 0])
            bbox = BoundingBox(
                x0=float(bbox_raw[0]),
                y0=float(bbox_raw[1]),
                x1=float(bbox_raw[2]),
                y1=float(bbox_raw[3]),
            )
            spatial_words.append(
                SpatialWord(
                    text=str(w.get("text", "")),
                    bbox=bbox,
                    page=int(w.get("page", 1)),
                    confidence=float(w.get("confidence", 1.0)),
                )
            )

        # 2. Extract Key Fields via SpatialEngine Ray-Casting
        engine = SpatialEngine(spatial_words)
        total_field = engine.extract_field("TOTAL", value_type="money")
        subtotal_field = engine.extract_field("SUBTOTAL", value_type="money")
        tax_field = engine.extract_field("TAX", value_type="money")
        inv_num_field = engine.extract_field("INVOICE_NUMBER", value_type="invoice_number")
        date_field = engine.extract_field("DATE", value_type="date")
        tax_id_field = engine.extract_field("TAX_ID", value_type="tax_id")

        # 3. Extract Line Items via DeterministicTableParser
        table_parser = DeterministicTableParser(spatial_words)
        extracted_table = table_parser.parse_items(page_num=1)

        # Parse numeric values
        def _to_float(fld):
            if not fld or not fld.parsed_value:
                return None
            try:
                # Clean currency symbols
                cleaned = "".join(c for c in fld.parsed_value if c.isdigit() or c in ".,-")
                if "," in cleaned and "." in cleaned:
                    if cleaned.rfind(",") > cleaned.rfind("."):
                        cleaned = cleaned.replace(".", "").replace(",", ".")
                    else:
                        cleaned = cleaned.replace(",", "")
                elif "," in cleaned:
                    cleaned = cleaned.replace(",", ".")
                return float(cleaned)
            except Exception:
                return None

        parsed_total = _to_float(total_field)
        parsed_subtotal = _to_float(subtotal_field)
        parsed_tax = _to_float(tax_field) or 0.0

        if parsed_subtotal is None and extracted_table.subtotal_calculated > 0:
            parsed_subtotal = extracted_table.subtotal_calculated

        if parsed_total is None and parsed_subtotal is not None:
            parsed_total = round(parsed_subtotal + parsed_tax, 2)

        # 4. Arithmetic & State Audit via DeterministicValidator
        extracted_invoice = ExtractedInvoice(
            document_id=doc_id,
            invoice_number=inv_num_field.parsed_value if inv_num_field else f"FAC-{file_hash[:6].upper()}",
            supplier_name="Proveedor Detectado (Rust)",
            tax_id=tax_id_field.parsed_value if tax_id_field else "900123456-1",
            issue_date=date_field.parsed_value if date_field else datetime.utcnow().strftime("%Y-%m-%d"),
            parsed_subtotal=parsed_subtotal or 0.0,
            parsed_tax_total=parsed_tax,
            parsed_withholding_total=0.0,
            parsed_total=parsed_total or 0.0,
            confidence_score=0.98 if spatial_words else 0.5,
            items=extracted_table.items,
        )

        validator = DeterministicValidator()
        audit_result = validator.validate_invoice(extracted_invoice)

        # 5. Persist to DB
        if AsyncSessionLocal is None:
            init_engine()
        async with AsyncSessionLocal() as db:
            # Check if document already exists
            stmt = select(Document).where((Document.id == doc_id) | (Document.file_hash_sha256 == file_hash))
            existing_doc = (await db.execute(stmt)).scalars().first()

            if existing_doc:
                doc = existing_doc
                doc.invoice_number = extracted_invoice.invoice_number
                doc.subtotal = audit_result.extracted_subtotal
                doc.tax_total = audit_result.tax_total
                doc.grand_total = audit_result.extracted_total
                doc.kono_state = audit_result.kono_state.value
                doc.processing_status = "AUDITED" if audit_result.kono_state.value == "GREEN" else "PENDING"
            else:
                doc = Document(
                    id=doc_id,
                    file_name=file_name,
                    file_path=file_path,
                    file_hash_sha256=file_hash,
                    mime_type="application/pdf",
                    file_size_bytes=file_size,
                    invoice_number=extracted_invoice.invoice_number,
                    vendor_name=extracted_invoice.vendor_name,
                    vendor_tax_id=extracted_invoice.tax_id,
                    issue_date=extracted_invoice.issue_date,
                    currency="COP",
                    subtotal=audit_result.extracted_subtotal,
                    tax_total=audit_result.tax_total,
                    withholding_total=0.0,
                    grand_total=audit_result.extracted_total,
                    processing_status="AUDITED" if audit_result.kono_state.value == "GREEN" else "PENDING",
                    kono_state=audit_result.kono_state.value,
                    extraction_method="RUST_GEOMETRIC_TRIAGE",
                    bounding_boxes={"words": [w.dict() for w in spatial_words[:400]]},
                )
                db.add(doc)

            # Persist items
            for item in extracted_table.items:
                item_obj = InvoiceItem(
                    document_id=doc.id,
                    line_number=item.line_number,
                    description=item.description,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    tax_rate=19.0,
                    total_price=item.total_price,
                    is_math_valid=item.is_math_valid,
                )
                db.add(item_obj)

            # Persist discrepancies
            for disc in audit_result.discrepancies:
                disc_obj = Discrepancy(
                    document_id=doc.id,
                    field_name=disc.field,
                    alert_type=disc.kind.value,
                    expected_value=disc.expected,
                    extracted_value=disc.extracted,
                    delta_amount=disc.delta,
                    description=disc.message,
                )
                db.add(disc_obj)

            await db.commit()
            logger.info("⚡ [Rust Pipeline Reconciled] Document %s saved in DB with state %s", doc.id, doc.kono_state)

            # 6. Broadcast to WebSockets
            if ws_manager:
                await ws_manager.broadcast(
                    {
                        "type": "DOCUMENT_PROCESSED",
                        "document_id": doc.id,
                        "kono_state": doc.kono_state,
                        "invoice_number": doc.invoice_number,
                        "grand_total": doc.grand_total,
                        "source": "RUST_CORE_PIPELINE",
                    }
                )

    async def run(self, redis_url: str, ws_manager=None):
        """Listens to Redis Streams published by Rust Core."""
        logger.info("🦀 [Redis Consumer] Connecting to Redis stream 'invoice_processing_stream'...")
        while self._running:
            try:
                r = await aioredis.from_url(redis_url)
                last_id = "$"
                while self._running:
                    streams = await r.xread({"invoice_processing_stream": last_id}, count=10, block=2000)
                    if not streams:
                        continue
                    for stream_name, messages in streams:
                        for message_id, fields in messages:
                            last_id = message_id
                            payload_str = fields.get(b"payload") or fields.get("payload")
                            if payload_str:
                                if isinstance(payload_str, bytes):
                                    payload_str = payload_str.decode()
                                try:
                                    payload_json = json.loads(payload_str)
                                    await self._process_rust_payload(payload_json, ws_manager)
                                except Exception as err:
                                    logger.error("Error processing stream entry %s: %s", message_id, err)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning("Redis stream reader error: %s. Reconnecting in 3s...", e)
                await asyncio.sleep(3)

    def start(self, redis_url: str, ws_manager=None):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self.run(redis_url, ws_manager))

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()


redis_pipeline_consumer = RedisPipelineConsumer()
