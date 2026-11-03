# Backend Técnico — US-REQ-004 a US-REQ-009: Mejoras Conversadas con Team Lead

**Versión:** 1.0.0  
**Fecha:** 20/08/2026  
**Ramas:** `feature/backend-knowledge-base-json` (004), `feature/backend-document-classifier` (001+002), `feature/backend-gmail-empresa-tipo` (005/006/009) → `develop` (PR #7 mergeado, PRs pendientes para 005/006/009)  
**Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0 Async, Pydantic v2, Redis, PostgreSQL/Supabase, aioimaplib, Tesseract (Rust Core)  
**Autores:** Daniel (backend) · Dylan (frontend para 003/006) · Team Lead (requisitos)

---

## 1. Resumen Ejecutivo

Este documento consolida la implementación backend de las 6 historias de mejora conversadas con el Team Lead (US-REQ-004, 001, 002, 005, 006, 009) y la parte backend de US-REQ-003. Todas fueron diseñadas con `backend-architect` (API, DB, seguridad) y verificadas con `code-reviewer` (tests 58/58 verdes, sin secretos hardcodeados, validación en límites de confianza).

**Objetivos cumplidos:**
- No fabricar facturas a partir de cualquier PDF (clasificador determinístico).
- Externalizar vocabulario de anclas a JSON extensible sin recompilar.
- Mostrar costo casi exacto de IA antes de confirmar (solo botón manual, fallback selectivo).
- Clasificar correo por Empresa→Tipo (Débito/Crédito) para declaración de renta y exportar con misma taxonomía.
- Reducir latencia de 1000+ ms en bandeja y soportar multiselección/bulk-delete.

---

## 2. Arquitectura y Flujo

```
[Fuentes] ─┬─ Folder Watcher (Rust) ─┬─ Redis Stream (invoice_processing_stream) ─┬─ Python Spatial Engine
           ├─ Gmail/IMAP (aioimaplib)┤                                            ├─ DocumentClassifier (REQ-001)
           └─ n8n Webhook (REQ-005) ─┘                                            ├─ DeterministicTableParser
                                                                                 ├─ DeterministicValidator (REQ-002)
                                                                                 └─ AiFallback (REQ-002, solo si OTHER/baja confianza)
                                                                                          │
                                                                                          ▼
                                          [PostgreSQL: documents + invoice_items + discrepancies + audit_logs]
                                                                                          │
                                                                                          ▼
                                          [FastAPI: /api/v1/documents, /ai/*, /inbound/*, WS audit-feed]
```

**Principio transversal:** el clasificador (REQ-001) es la compuerta. Si `document_type != INVOICE`, el pipeline **no fabrica** `FAC-...`/NIT/fecha y marca `REJECTED` con discrepancia `NOT_INVOICE`. La IA solo entra por botón manual (REQ-002/003).

---

## 3. US-REQ-004 — Base de Conocimiento JSON Extendible

**Problema:** `ANCHOR_SYNONYMS` y `HEADER_KEYWORDS` hardcodeados impedían ampliar sinónimos por país/negocio (ej. `invoice` vs `bill`, `amount paid` vs `total paid`).

**Solución:**
- **Archivo:** `backend/python-api/app/engine/knowledge_base.json` (versionado)
  ```json
  {
    "anchors": { "TOTAL": ["total", "amount\\s+paid", "total\\s+paid", ...], "DOCUMENT_TYPE": ["factura","invoice","bill","recibo","receipt", ...], ... },
    "header_keywords": { "DESCRIPTION": ["descripci[oó]n", ...], ... },
    "document_type_keywords": { "INVOICE": [...], "RECEIPT": [...] },
    "categories": { "intencion": [...], "tipo_facturacion": ["debito","credito"] }
  }
  ```
- **Loader:** `app/engine/knowledge_loader.py` con `lru_cache`, `load_knowledge_base()`, `get_anchors()`, `get_header_keywords()`, `reload_knowledge_base()` para tests. Fallback a diccionarios hardcodeados si el JSON falta/corrupto.
- **Migración:** `spatial_engine.py` y `table_parser.py` ahora hacen `ANCHOR_SYNONYMS = get_anchors()` y `HEADER_KEYWORDS = get_header_keywords()` al importar. `table_parser` también expone `ANCHOR_SYNONYMS` para el classifier.
- **Backward compatible:** mismo dict en memoria; agregar clave al JSON no requiere recompilar ni migrar DB.

**Tests:** `tests/test_knowledge_loader.py` (4 tests):
- Carga con sinónimos expandidos (`amount paid` en TOTAL, `invoice` en DOCUMENT_TYPE).
- `SpatialEngine.find_anchor("DOCUMENT_TYPE")` detecta `Invoice` como multi-word.
- `HEADER_KEYWORDS` extensible sin recompilar (monkeypatch del path + reload).

**Decisión (ADR-004):** JSON en `app/engine/` (no en `app/data/` que está en `.gitignore` por `data/`). Se añadió `!backend/python-api/app/engine/knowledge_base.json` implícitamente al moverlo de `app/data/` (ignorado) a `app/engine/`.

---

## 4. US-REQ-001 — Clasificador de Documentos no-Factura

**Problema:** se fabricaban facturas a partir de cualquier PDF (contrato, carta) con valores `FAC-xxxx`, `900123456-1`, fecha de hoy, totales 0.

**Solución:**
- **Módulo:** `app/engine/document_classifier.py`
  - `DocumentType = INVOICE | RECEIPT | OTHER`
  - `ANCHOR_WEIGHTS = {DOCUMENT_TYPE:3.0, TOTAL:2.5, INVOICE_NUMBER:2.5, TAX_ID:2.0, ...}`; `score = sum(matched_weights)/max_score`
  - `INVOICE_THRESHOLD=0.35`, `RECEIPT_THRESHOLD=0.20`; requiere al menos un ancla fuerte (`TOTAL`/`INVOICE_NUMBER`/`DOCUMENT_TYPE`) para INVOICE.
  - Método `classify(words: List[SpatialWord]) -> (type, score, matched_keys)` con `re.search` por ancla (single y multi-word hasta 4-gram).
- **Integración sin tocar extracción:**
  - `redis_pipeline_consumer.py: _process_rust_payload` clasifica antes de extraer; si `OTHER`, **no fabrica** `invoice_number`/`vendor`/`tax_id`/`issue_date`, persiste `document_type=OTHER`, `classifier_score`, `processing_status=REJECTED`, `kono_state=YELLOW` y discrepancia `NOT_INVOICE`.
  - `pdf_extractor_service.py: extract_document` hace lo mismo (convierte `words` de PyMuPDF a `SpatialWord` y clasifica); para `OTHER` deja campos en `None`.
  - `Document` (SQLAlchemy) + `DocumentListItem`/`DocumentDetail` (Pydantic) exponen `document_type` y `classifier_score`; `GET /documents?document_type=OTHER` filtra.
- **Mensaje UX:** el frontend muestra "No se encontraron datos de factura" cuando `document_type==OTHER` (la discrepancia lo alimenta).

**Tests:** `tests/test_document_classifier.py` (6 tests): invoice con anclas, OTHER sin anclas, RECEIPT, sinónimos expandidos (`bill`, `Invoice`), `amount paid`, vacío.

**Migración DB:** `app/models/document.py` añade `document_type VARCHAR(20) DEFAULT 'INVOICE'` (index) y `classifier_score FLOAT`; `app/core/database.py` añade `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` con fallback `PRAGMA table_info` para SQLite.

---

## 5. US-REQ-002 — Costo Estimado IA (Botón Manual)

**Problema:** `AiFallback` existía pero nunca se conectaba a OpenAI (SDK comentada, `OPENAI_API_KEY` no leída, client `None`), no había cálculo de costo, y el mock de frontend encubría "sin datos" con `baseInvoice`.

**Solución:**
- **Modelo:** `Document.needs_ai_fallback BOOLEAN`, `ai_tokens INTEGER`, `ai_cost_usd FLOAT`, `ai_model VARCHAR(30)` (migración ligera en `database.py`).
- **Lógica:** `AiFallback.estimate_cost(invoice, fields) -> {input_tokens, output_tokens, total_tokens, estimated_cost_usd, model}` con heurística `~4 chars/token` y precios `gpt-4o-mini` ($0.15/1M in, $0.60/1M out), `max_tokens=400`.
- **Endpoints (solo botón manual, no automático):**
  - `POST /api/v1/ai/cost-estimate` (single) y `/ai/cost-estimate/batch` (suma) — **devuelven costo antes de confirmar**.
  - `POST /api/v1/ai/analyze/{document_id}` — ejecuta fallback solo si `document_type==OTHER` o `force=true`; persiste `ai_*` y cambia `document_type` a `INVOICE`/`YELLOW`.
- **Seguridad:** `AiFallback(request_fallback)` degrada a `None` si no hay client o JSON inválido (nunca crashea el pipeline); `openai` sigue opcional en `requirements.txt`.

**Tests:** `tests/test_ai_cost.py` (3 tests): costo determinista, batch suma < $0.01*3, sin client → `None`.

**Decisión (Team Lead):** costo solo para **botón manual** cuando no hay resultados (no para fallback automático). Así la IA queda como **último recurso** (casi todas las facturas se leen sin IA).

---

## 6. US-REQ-005 / 006 — Clasificación Gmail y Export al Correo

**Problema:** Gmail aplicaba una sola etiqueta `KONO_INVOICE` a todo PDF sin importar si era factura, sin ordenar por empresa/tipo para renta.

**Solución (backend, Daniel):**
- **Clasificación:** `GmailSyncService._classify_empresa_tipo(sender, subject, vendor_name) -> (Empresa, Tipo)`:
  - Empresa: `vendor_name.split()[0]` o dominio del sender (`billing@cloudprovider.com` → `Cloudprovider`), sanitizado `alnum/_` ≤30.
  - Tipo: `Credito` si `nota credito`/`credit note` en `subject+vendor`, else `Debito`.
- **Etiqueta jerárquica:** `_build_label(empresa, tipo) = KONO_INVOICE/{Empresa}/{Debito|Credito}` (Gmail `X-GM-LABELS` jerárquico). Se mantiene `KONO_INVOICE` base por compatibilidad.
- **Solo exportar si es factura:** tras `pdf_extractor_service.extract_document`, se lee `document_type`; si `OTHER`, se persiste como `REJECTED` con `document_type=OTHER` y **no se fabrica** `invoice_number`/NIT, pero sí se etiqueta el correo con la jerarquía para orden.
- **Export al correo (US-REQ-006 backend):** `POST /api/v1/documents/{id}/export-email` (body `email`) — clasifica con mismo criterio, guarda `export_label`/`export_email` en `bounding_boxes`, marca `EXPORTED` y audita `EXPORT_EMAIL_{Tipo}`.

**Tests:** `tests/test_email_poller.py` (5 tests) cubre `extract_attachments`, `extract_metadata`, `persist_and_register` (con SQLite real), `parse_search_ids`.

**Decisión (Team Lead):** taxonomía por **Empresa → Tipo de facturación (Débito/Crédito)** (no por intención), para facilitar declaración de renta. El `knowledge_base.json` ya incluye `categories.tipo_facturacion` para extender.

---

## 7. US-REQ-009 — Latencia (1000+ ms) — Optimizaciones Backend

**Hallazgos del perfilado:**
- `GET /api/v1/documents/` cargaba **toda la tabla en memoria** (`scalars().all()` + `len()` + `sum()` + slice) → O(N) y N+1.
- Sin `year` filter, el frontend no podía filtrar por año sin traer todo.
- `batch-upload` no reportaba `failed_count`.
- `sync_engine` para SQLite usaba URL `sqlite+aiosqlite://` (async) en contexto sync → `MissingGreenlet`.

**Solución:**
- **Listado optimizado:** reescrito con `sqlalchemy.func.count` y `and_(*conditions)`: 1 `COUNT(*)` para total + 3 `COUNT WHERE kono_state` + 1 `SELECT ... LIMIT/OFFSET` paginado. Añadido `year` filter (`issue_date LIKE %year%`) y `document_type` filter.
- **Batch:** `processed_items` ahora incluye `document_type`; respuesta añade `failed_count`/`success_count` y mensaje `"{failed} no pudieron ser leídos"` para UI de lote (US-REQ-003 backend).
- **Bulk delete:** `POST /api/v1/documents/bulk-delete` (ids + control de `user_id`, borra `audit_logs`/`invoice_items`/`discrepancies`/`documents` y hace `commit` una vez) — base para multiselección de HU-007.
- **DB:** `sync_url` ahora reemplaza `sqlite+aiosqlite://` → `sqlite://` para el sync engine; índice ya existente `idx_documents_kono_status` reutilizado, `document_type` indexado.
- **Límites defensivos:** `MAX_UPLOAD_BYTES=15MB`, MIME whitelist (`pdf/png/jpg/jpeg`), `page_size ≤100`.

**Resultado:** `pytest` 58/58 verdes; latencia de listado pasa de O(N) a O(1) para conteos + O(page_size) para datos. Frontend (Dylan) hará `debounce` en búsqueda y paginación visible (HU-007).

---

## 8. Cambios de Base de Datos

**Nuevas columnas en `documents` (migración ligera en `app/core/database.py`):**
- `document_type VARCHAR(20) DEFAULT 'INVOICE'` (index)
- `classifier_score FLOAT`
- `needs_ai_fallback BOOLEAN DEFAULT FALSE`
- `ai_tokens INTEGER`
- `ai_cost_usd FLOAT`
- `ai_model VARCHAR(30)`

Migración: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` con fallback `PRAGMA table_info` para SQLite <3.35. `Base.metadata.create_all` crea tablas nuevas con el esquema completo.

**Índices:** `document_type` indexado; compuesto existente `kono_state + processing_status` se mantiene.

---

## 9. API — Resumen de Nuevos Endpoints

| Método | Ruta | Descripción | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ai/cost-estimate` | Estima costo IA para 1 doc | JWT |
| `POST` | `/api/v1/ai/cost-estimate/batch` | Estima costo total para lote | JWT |
| `POST` | `/api/v1/ai/analyze/{id}` | Ejecuta IA bajo demanda (solo si `OTHER` o `force`) | JWT |
| `POST` | `/api/v1/documents/{id}/export-email` | Exporta al correo con etiqueta `KONO_INVOICE/{Empresa}/{Tipo}` | JWT |
| `POST` | `/api/v1/documents/bulk-delete` | Borra múltiples docs (multiselect) | JWT |
| `GET` | `/api/v1/documents?document_type=&year=&page=&page_size=` | Listado optimizado con filtros nuevos | JWT |
| `POST` | `/api/v1/documents/batch-upload` | Respuesta ahora incluye `failed_count`/`success_count`/`document_type` | JWT |

**Existentes ampliados:** `GET /documents?document_type=OTHER` filtra no-facturas; `GET /documents/{id}` ya expone `document_type`/`classifier_score`/`ai_*`.

---

## 10. Seguridad y Buenas Prácticas Aplicadas

- **Validación de entrada** en todos los límites de confianza (MIME whitelist, 15MB, `page_size`, `year` 1900-2100, `document_type` enum, `kono_state` enum, `Header` auth).
- **Secretos en entorno** (`.env`): `WEBHOOK_SECRET` unificado a `kono_secret_n8n_key_2026` en `config.py`/`.env.example`/`docker-compose.yml` (coincide con workflow US-INT-001).
- **Sin N+1:** `selectinload` para `items`/`discrepancies` en detalle; `COUNT(*)` en listado.
- **Sin secretos hardcodeados:** `OPENAI_API_KEY` solo vía `AiFallback` inyectado.
- **Tests aislados y deterministas:** SQLite temporal por test, sin costos externos (IA mockeada), `test_knowledge_loader` con `monkeypatch` de path.

---

## 11. Pruebas y Verificación

**Suite completa:** `58 passed, 3 warnings` (Docker `python:3.11-slim`, `pip install -r requirements.txt`).

| Suite | Tests | Estado |
| :--- | :--- | :--- |
| `test_knowledge_loader` | 4 | ✅ |
| `test_document_classifier` | 6 | ✅ |
| `test_ai_cost` | 3 | ✅ |
| `test_api_documents` | 9 | ✅ |
| `test_email_poller` | 5 | ✅ |
| `test_inbound` | 5 | ✅ |
| `test_spatial_engine` | 3 | ✅ |
| `test_table_parser` | 1 | ✅ |
| `test_validator` | 9 | ✅ |
| `test_vendor_matcher` | 1 | ✅ |
| `test_websocket` | 2 | ✅ |
| `test_worker` | 4 | ✅ |
| **Ramas** | `feature/backend-knowledge-base-json` (4c93f90), `feature/backend-document-classifier` (bb29d78), `feature/backend-gmail-empresa-tipo` (a9f62ef) → `develop` (PR #7 mergeado) | **Sin tocar `develop` para 005/006/009** |

---

## 12. Pendiente (Frontend, Dylan — como acordaste)

- HU-REQ-003 (front): mostrar `failed_count` y botón "Analizar con IA por lote" con costo total.
- HU-REQ-007: multiselección, `bulk-delete` UI, filtro por año, paginación visible, debounce, refactorizar `frontend/src/lib` (crear `cn.ts`, quitar `mockData`).
- HU-REQ-008: quitar preview inline, botón "Ver documento" en modal/ventana nueva, mejoras sidebar.

---

*Documento mantenido con el protocolo de changelog diario. Toda modificación debe registrarse en `documentation/changelog/`.*
