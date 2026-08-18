# Especificación Técnica de Arquitectura Backend: Kono.ai

**Versión:** 1.0.0  
**Stack Principal:** Python 3.11+, FastAPI, Redis (Async Queue / ARQ / Celery), PyMuPDF (C-bindings), Pydantic v2, RapidOCR, OpenAI API (`gpt-4o-mini`).

---

## 1. Visión General de la Arquitectura Backend

El backend de **Kono.ai** está diseñado bajo los principios de **alto rendimiento, determinismo matemático estricto y cero desperdicio de tokens de IA**. Procesa documentos PDF digitales e imágenes en milisegundos mediante análisis posicional y encola tareas en **Redis** para garantizar procesamiento asíncrono no bloqueante.

```
                           [Fuentes de Ingesta]
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
  [Folder Watcher Local]   [Upload Web / Drag&Drop]    [Webhooks / Gmail]
           │                        │                        │
           └────────────────────────┬────────────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │ 🚀 FastAPI Ingestion API (< 2 ms)    │
                 │ • Genera UUIDv4 y Hash SHA-256       │
                 │ • Guarda archivo original en Storage │
                 │ • Encola tarea en Redis Stream/Queue │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │ 📨 Redis Job Queue (In-Memory Broker)│
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │ ⚙️ Async Background Worker (ARQ)     │
                 │                                      │
                 │ 1. TRIAGE DE DOCUMENTO:              │
                 │    - PDF Digital (PyMuPDF) -> BBoxes │
                 │    - Imagen/Scan (RapidOCR + OpenCV) │
                 │                                      │
                 │ 2. MOTOR DE EXTRACCIÓN DETERMINISTA: │
                 │    - Layout Cache (Vendor Template)  │
                 │    - Anclas & Ray-Casting Heurístico │
                 │    - Extractor Tabular de Ítems      │
                 │                                      │
                 │ 3. MOTOR DE VALIDACIÓN MATEMÁTICA:   │
                 │    - Σ(Cant * P.Unit) = Subtotal     │
                 │    - Subtotal + IVA - Ret = Total    │
                 │    - Tolerancia de redondeo: ±0.02   │
                 │                                      │
                 │ 4. FALLBACK INTELIGENTE (Opcional):  │
                 │    - Solo si Confianza < 70%         │
                 │    - Invocación selectiva a OpenAI   │
                 │                                      │
                 │ 5. ASIGNACIÓN ESTADO KONO:           │
                 │    - 🟢 GREEN / 🟡 YELLOW / 🔴 RED   │
                 └──────────────────┬───────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
               ┌──────────────────┐  ┌──────────────────┐
               │ 🗄️ Base de Datos │  │ ⚡ WebSockets    │
               │ (SQLite / Postgres) │ (Alerta a UI)   │
               └──────────────────┘  └──────────────────┘
```

---

## 2. Módulos y Estructura del Código Backend

```
backend/
├── app/
│   ├── main.py                  # Entrada FastAPI, CORS y ciclo de vida
│   ├── core/
│   │   ├── config.py            # Variables de entorno (Redis URL, DB URL, OpenAI Key)
│   │   ├── security.py          # Hashing, autenticación y tokens
│   │   └── database.py          # Sesión SQLAlchemy / asyncpg
│   ├── api/
│   │   ├── v1/
│   │   │   ├── documents.py     # Endpoints CRUD de facturas y subida de archivos
│   │   │   ├── vendors.py       # Endpoints de proveedores y plantillas aprendidas
│   │   │   ├── audit.py         # Endpoints de aprobación 1-click y correcciones
│   │   │   └── websockets.py    # Notificaciones en tiempo real para la UI
│   ├── engine/
│   │   ├── triage.py            # Detección de PDF digital vs escaneo
│   │   ├── digital_parser.py    # Extractor posicional PyMuPDF (palabras y coordenadas)
│   │   ├── image_ocr.py         # Deskewing OpenCV + RapidOCR posicional
│   │   ├── spatial_engine.py    # Anclas geométricas, Ray-Casting y parser de tablas
│   │   ├── validator.py         # Reglas aritméticas deterministas (±0.02)
│   │   ├── vendor_matcher.py    # Auto-aprendizaje y ejecución de plantillas
│   │   └── ai_fallback.py       # Cliente OpenAI con Pydantic/Structured Outputs
│   ├── queue/
│   │   ├── worker.py            # Consumidor de tareas asíncronas Redis (ARQ / Celery)
│   │   └── tasks.py             # Definición del pipeline de procesamiento
│   ├── watcher/
│   │   └── folder_watcher.py    # Observador de carpetas locales/NFS con watchdog
│   ├── models/                  # Modelos SQLAlchemy ORM
│   └── schemas/                 # Esquemas Pydantic v2 (Input/Output/JSON Schemas)
└── requirements.txt
```

---

## 3. Detalle del Pipeline de Procesamiento

### 3.1 Ingesta & Folder Watcher
- **Mecanismo:** El servicio utiliza `watchdog` en Python con eventos de inotify de bajo nivel.
- **Acción:** Al detectar un archivo cerrado (`IN_CLOSE_WRITE`), calcula inmediatamente el `SHA-256`. Si el hash ya existe en la base de datos, lo marca como duplicado en **< 1 ms**. Si es nuevo, encola la ruta del archivo en Redis.

### 3.2 Triage Posicional
- Con `PyMuPDF`, se analiza el número de caracteres vectoriales extraíbles:
  - Si `len(page.get_text()) > 50`: Se extraen las palabras directamente con sus Bounding Boxes: `page.get_text("words")` -> `[x0, y0, x1, y1, "texto", block_no, line_no, word_no]`.
  - Si `len(page.get_text()) <= 50`: Se rasteriza la página a 300 DPI y se pasa a `RapidOCR` + `OpenCV` para obtener la matriz de palabras con coordenadas.

### 3.3 Extracción Espacial Heurística (Ray-Casting)
- **Búsqueda de Anclas:** Diccionario de sinónimos configurables:
  - `TOTAL`: `["total", "total a pagar", "gran total", "importe total", "valor total", "total factura"]`
  - `SUBTOTAL`: `["subtotal", "sub-total", "base imponible", "valor antes de iva", "importe neto"]`
  - `TAX`: `["iva", "impuesto", "vat", "tax", "igv"]`
  - `DATE`: `["fecha", "fecha emision", "fecha de expedición", "date", "fecha factura"]`
  - `INVOICE_NUM`: `["factura n", "factura no", "factura electrónica", "invoice no", "folio"]`
- **Geometría de Búsqueda:** Para cada ancla encontrada en $(X_a, Y_a)$, busca valores numéricos o de fecha en:
  1. Franja horizontal derecha: $X > X_a$ dentro de un margen vertical $|Y - Y_a| \le 12\text{ px}$.
  2. Franja vertical inferior: $Y > Y_a$ alineado con $X \approx X_a$.

### 3.4 Motor Determinista de Validación Matemática
```python
def validate_financials(extracted_data: InvoiceExtractedData) -> AuditResult:
    alerts = []
    
    # 1. Sumatoria de items
    calculated_subtotal = sum(
        item.quantity * item.unit_price for item in extracted_data.items
    )
    
    # 2. Tolerancia de redondeo
    subtotal_diff = abs(extracted_data.subtotal - calculated_subtotal)
    if subtotal_diff > 0.02:
        alerts.append(f"Discrepancia en Subtotal: extraído={extracted_data.subtotal}, calculado={calculated_subtotal}")
        
    # 3. Total general
    expected_total = extracted_data.subtotal + extracted_data.tax_total - extracted_data.withholding_total
    total_diff = abs(extracted_data.grand_total - expected_total)
    if total_diff > 0.02:
        alerts.append(f"Discrepancia en Total: extraído={extracted_data.grand_total}, calculado={expected_total}")
        
    # 4. Asignación de Estado Kono
    if not alerts and extracted_data.tax_id_valid:
        state = "GREEN"
    elif any("duplicado" in a.lower() for a in alerts) or not extracted_data.tax_id_valid:
        state = "RED"
    else:
        state = "YELLOW"
        
    return AuditResult(state=state, alerts=alerts, discrepancy_amount=max(subtotal_diff, total_diff))
```

---

## 4. API Endpoints Principales (FastAPI)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/documents/upload` | Subida manual de factura (PDF o Imagen). Encola en Redis. |
| `GET` | `/api/v1/documents/` | Lista paginada con filtros por estado Kono (Green/Yellow/Red), fecha y proveedor. |
| `GET` | `/api/v1/documents/{id}` | Detalle completo de factura, campos extraídos, coordenadas BBox y alertas. |
| `GET` | `/api/v1/documents/{id}/file` | Sirve el archivo binario original para el visor PDF interactivo. |
| `PUT` | `/api/v1/documents/{id}/approve` | Aprobación 1-Click (actualiza estado a `APPROVED` y exporta a contabilidad). |
| `PUT` | `/api/v1/documents/{id}/correct` | Corrección manual de campos y auto-generación de plantilla de proveedor. |
| `GET` | `/api/v1/vendors/{tax_id}/template` | Obtiene las reglas/coordenadas aprendidas para un proveedor. |
| `WS` | `/api/v1/ws/audit-feed` | Stream WebSocket en tiempo real de documentos procesados. |

---

## 5. Resiliencia, Concurrencia y Configuración de Redis

- **Gestor de Colas:** `arq` (Redis-based async queue para Python asyncio) o `Celery` con Redis broker.
- **Concurrencia:** 4 a 8 workers asíncronos en paralelo.
- **Reintentos:** 3 reintentos con backoff exponencial para llamadas opcionales de fallback.
- **Persistencia de Redis:** RDB snapshot cada 60 segundos o AOF para evitar pérdida de tareas en caso de reinicio.
