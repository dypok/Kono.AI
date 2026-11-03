# US-PY-003 — API REST FastAPI, WebSockets en Tiempo Real & Exportación Contable

**Historia de Usuario:** US-PY-003
**Asignado:** Daniel (compartida con Dylan)
**Rama:** `feature/py-fastapi-crud-websockets-export`
**Versión:** 1.0.0 · **Fecha:** 18/08/2026
**Estándares:** `backend-architect` (diseño), `code-reviewer` (auto-revisión), SOLID/DRY,
REST semántico, validación de entrada, tests deterministas y sin infraestructura externa.

---

## 1. Resumen

US-PY-003 construye la **capa de exposición** de Kono.ai: la API REST que consume el
frontend (React, de Sayder) y los sistemas ERP contables, más el **canal WebSocket de
tiempo real** que notifica los documentos auditados. Es la pieza que conecta el motor
de negocio (PY-001 espacial + PY-002 validador) con la interfaz de usuario.

Alcance entregado:
1. **Capa de persistencia SQLAlchemy Async** (modelos alineados con `db_v0.md`).
2. **Endpoints REST** bajo `/api/v1` (documents, vendors, audit).
3. **Canal WebSocket** `/api/v1/ws/audit-feed` con **bridge a Redis** (`kono_feed_channel`).
4. **Exportación** CSV / JSON para SAP/Oracle/Excel.
5. **Tests** de API (httpx) y WebSocket (11 tests).

---

## 2. Decisiones de Arquitectura (ADR)

### ADR-1 · Persistencia real con SQLAlchemy 2.0 Async
Se eligió persistencia **real** (no en-memoria) porque el DoD y `db_v0.md` lo exigen y
porque los endpoints de aprobación/auditoría deben dejar traza. Se usó el **mismo
`Base`** que ya usaba `VendorTemplate` de PY-001 (refactor: `Base` ahora vive en
`app/core/database.py` y `vendor.py` lo importa) para que **todas** las tablas
compartan la metadata y se creen con `Base.metadata.create_all`.

### ADR-2 · `Base` centralizado
Antes, `vendor.py` definía su propio `declarative_base()`. Para que `Document`,
`InvoiceItem`, `Discrepancy`, `AuditLog` y `VendorTemplate` se registren en el mismo
metadata, se movió `Base` a `database.py`. Sin esto, `create_all` no crearía todas las
tablas (bug latente de metadata separada).

### ADR-3 · Inyección de dependencias `get_db`
Cada endpoint recibe la sesión async vía `Depends(get_db)` (FastAPI). El engine es
**re-inicializable** (`init_engine`) para que los tests apunten a un SQLite temporal y
hagan `create_all`/`drop_all` por caso.

### ADR-4 · Orden de rutas: literales antes de parámetros
`/export` debe declararse **antes** de `/{document_id}`, si no FastAPI captura `export`
como `document_id` (404). Se documentó y corrigió durante el desarrollo (bug real de
API detectado por test).

### ADR-5 · Carga ansiosa (`selectinload`) para el detalle
`GET /{document_id}` usa `selectinload` sobre `items`/`discrepancies`/`audit_logs` para
evitar `MissingGreenlet` (acceso lazy fuera de la sesión async). Sin esto, Pydantic
falla al serializar el detalle completo.

### ADR-6 · WebSocket: manager compartido + bridge de Redis
`ConnectionManager` se guarda en `app.state` (única instancia) y un **background task**
(`run_redis_bridge`) suscribe a `kono_feed_channel` y hace *broadcast* a los clientes
conectados. Si Redis cae, el bridge **se reconecta** (loop con `except` + sleep), no
tumba la API.

### ADR-7 · Tests sin infraestructura externa
- API → SQLite temporal + `ASGITransport` de httpx (sin levantar servidor).
- WebSocket → `TestClient` de Starlette + un test de unidad del manager con socket
  falso (sin Redis real).
- Resultado: **35/35 tests verdes** en entorno limpio (Docker `python:3.11-slim`).

---

## 3. Estructura del Código (nuevo en esta US)

```
backend/python-api/app/
├── core/
│   ├── __init__.py
│   ├── config.py            # Settings (DATABASE_URL, STORAGE_DIR, REDIS_URL, CORS)
│   └── database.py          # Base central, engine async, sesión, get_db
├── models/
│   ├── __init__.py          # Re-exporta todos los modelos
│   ├── vendor.py            # (refactor) importa Base de database.py
│   └── document.py          # Document, InvoiceItem, Discrepancy, AuditLog
├── schemas/
│   └── document.py          # Schemas Pydantic de la API (list/detail/correction/action)
├── api/
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── documents.py     # upload, list, detail, file, approve, correct, export
│       ├── vendors.py       # CRUD de plantillas de proveedores
│       ├── audit.py         # Logs de auditoría
│       └── websockets.py    # ConnectionManager + bridge Redis
└── main.py                  # registra routers, lifespan, WS endpoint
```

---

## 4. Endpoints REST (`/api/v1`)

| Método | Endpoint | Descripción | Códigos |
| :--- | :--- | :--- | :--- |
| `POST` | `/documents/upload` | Subida de PDF/imagen con validación MIME | 201 / 415 / 413 |
| `GET` | `/documents/` | Listado paginado + filtro `kono_state` y `q` | 200 |
| `GET` | `/documents/{id}` | Detalle completo con ítems, bboxes y alertas | 200 / 404 |
| `GET` | `/documents/{id}/file` | Streaming del binario original (visor PDF) | 200 / 404 |
| `PUT` | `/documents/{id}/approve` | Aprobación 1-Click + registro en `audit_logs` | 200 / 404 |
| `PUT` | `/documents/{id}/correct` | Corrección manual de campos | 200 / 404 |
| `GET` | `/documents/export` | Export `format=csv|json` para ERP | 200 |
| `GET` | `/vendors/` | Lista de plantillas de proveedores | 200 |
| `GET` | `/vendors/{tax_id}/template` | Plantilla de un emisor | 200 / 404 |
| `POST` | `/vendors/` | Crear/actualizar plantilla | 201 |
| `GET` | `/audit/` | Logs de auditoría (filtrable por document_id) | 200 |

### Validaciones (seguridad / OWASP)
- MIME de subida **whitelist** (`application/pdf`, `image/png`, `image/jpeg`).
- Límite de tamaño (15 MB) — defensivo contra subidas sin fin.
- Rutas de streaming con control de existencia (evita path traversal a archivos inexistentes).
- `page_size` acotado (≤ 100) y `page ≥ 1` (paginación controlada).

---

## 5. Modelos ORM (alineados con `db_v0.md`)

| Tabla | Campos clave |
| :--- | :--- |
| `documents` | `id`, `file_hash_sha256` (unique), `mime_type`, `invoice_number`, `subtotal`, `tax_total`, `withholding_total`, `grand_total`, `extraction_method`, `kono_state`, `processing_status`, `bounding_boxes` |
| `invoice_items` | `document_id` (FK), `line_number`, `description`, `quantity`, `unit_price`, `total_price`, `is_math_valid`, `bbox_coordinates` |
| `discrepancies` | `document_id` (FK), `field_name`, `alert_type`, `expected_value`, `extracted_value`, `delta_amount`, `description` |
| `audit_logs` | `document_id` (FK), `user_id`, `action`, `previous_state`, `new_state`, `timestamp` |

Índice compuesto: `(kono_state, processing_status)` para el listado filtrado.

---

## 6. WebSocket en Tiempo Real

- Endpoint: `WS /api/v1/ws/audit-feed`.
- `ConnectionManager`: registra clientes, hace `broadcast` (drop de clientes muertos).
- **Bridge de Redis**: `run_redis_bridge(redis_url, "kono_feed_channel")` suscribe y
  re-emite eventos `DOCUMENT_PROCESSED` / `METRICS_UPDATE` a todos los clientes.
  Reconexión automática ante caída de Redis.
- El worker de US-PY-002 ya publica en `kono_feed_channel` → el ciclo cierra:
  `Rust triage → PY valida → worker publica → WS emite → React actualiza en vivo`.

---

## 7. Integración con el resto del proyecto

- **PY-002 mergeado en esta rama**: PY-003 consume `app.schemas.audit` (KonoState) y el
  canal de eventos del worker. La rama de PY-003 contiene ambos para ser integrable.
- **PY-001**: reutiliza `VendorTemplate` (modelo) vía `models/vendor.py`.
- **Frontend (Sayder)**: consume los endpoints REST y el WS para el dashboard.
- **DB**: `Base.metadata.create_all` crea las tablas al arranque (desarrollo); para
  producción se migraría a Alembic (trabajo futuro).

---

## 8. Verificación

Todos los tests corren en entorno limpio (Docker `python:3.11-slim`) y offline:

| Suite | Resultado |
| :--- | :--- |
| `test_api_documents.py` (upload, batch 10, list, detail, approve, correct, export) | 9 passed |
| `test_websocket.py` (handshake + broadcast) | 2 passed |
| PY-001 + PY-002 (spatial/table/vendor + validator/ai/worker) | 24 passed |
| **TOTAL** | **35 passed** |

Bugs reales detectados y corregidos por los tests:
- `/export` capturado por `/{document_id}` (orden de rutas).
- `MissingGreenlet` al serializar relaciones lazy (→ `selectinload`).
- `InstanceState` no serializable en `audit_logs` (→ snapshot de columnas).
- Export JSON doble-codificado (→ devolver lista, no string pre-serializado).
- `datetime` vs `str` en schemas de listado y audit logs.

---

## 9. Trabajo Futuro / Pendientes

- Migraciones **Alembic** (producción/PostgreSQL).
- Auth real (JWT) en los endpoints (hoy el CORS permite orígenes configurados).
- Wireframe del endpoint `upload` para encolar el archivo al pipeline real
  (hoy registra `PENDING`; la triage/triage lo procesa por el watcher de Rust).
- Métricas `METRICS_UPDATE` reales (tiempo de procesamiento desde el worker).

---

*Documento mantenido con el protocolo de changelog del workspace. Toda modificación
debe registrarse en `documentation/changelog/`.*
