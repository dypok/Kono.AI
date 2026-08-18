# Especificación Técnica de Arquitectura Dual-Backend: Kono.ai

**Versión:** 1.0.0  
**Stack Principal:** 
- **Core de Ingesta y Pre-procesamiento:** Rust (Tokio, `notify`, `lopdf` / `pdfium-render`, `image-rs` / OpenCV bindings, `sha2`, `redis-rs`).
- **Core de Negocio, Auditoría y API:** Python 3.11+ (FastAPI, SQLAlchemy 2.0 Async, Pydantic v2, RapidOCR, OpenAI API `gpt-4o-mini`).
- **Broker / Job Queue:** Redis (Redis Streams / In-Memory Queue).

---

## 1. Visión General de la Arquitectura Dual-Backend (Rust + Python)

La arquitectura de **Kono.ai** combina la velocidad extrema y seguridad de memoria de **Rust** para el I/O intensivo, hashing y triage de documentos, junto con la flexibilidad y ecosistema de **Python** para el motor de auditoría determinista, reglas fiscales y endpoints REST.

```
                           [Fuentes de Ingesta]
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
  [Folder Watcher Local]   [Upload Web / Drag&Drop]    [Webhooks / Gmail]
           │                        │                        │
           └────────────────────────┬────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────────┐
       │ 🦀 RUST INGESTION & PRE-PROCESSING CORE (< 3 ms)            │
       │ • Daemon Folder Watcher (`notify` / inotify bajo nivel)     │
       │ • Hashing instantáneo SHA-256 (`sha2`) para deduplicación   │
       │ • Storage Persistor: Guarda archivo original en disco / S3  │
       │ • Fast PDF Triage & Geometría (`lopdf` / `pdfium`):         │
       │   - Extracción de palabras con Bounding Boxes (x0,y0,x1,y1) │
       │ • Image Pre-processor (`image-rs` / OpenCV):                │
       │   - Deskewing (enderezado), Denoise y Otsu Thresholding     │
       │ • Encolador ultra-rápido en Redis Stream (`redis-rs`)       │
       └────────────────────────────┬────────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────────┐
       │ 📨 REDIS JOB QUEUE (Broker asíncrono y búfer de eventos)   │
       └────────────────────────────┬────────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────────┐
       │ 🐍 PYTHON BUSINESS, AUDIT & API ENGINE (FastAPI)            │
       │ • Consumidor Worker Async de Redis                          │
       │ • Vendor Matcher (Búsqueda de plantillas aprendidas)        │
       │ • Spatial Heuristic Parser (Ray-Casting de Anclas & Tablas) │
       │ • Motor Determinista de Validación Matemática (±0.02)       │
       │ • Fallback Inteligente Opcional (OpenAI solo si duda < 70%) │
       │ • Asignador de Estado Kono (🟢 Green / 🟡 Yellow / 🔴 Red)  │
       │ • FastAPI REST API & WebSockets en tiempo real              │
       └────────────────────────────┬────────────────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
               ┌──────────────────┐  ┌──────────────────┐
               │ 🗄️ Base de Datos │  │ ⚡ WebSockets    │
               │ (SQLite / Postgres) │ (Feed para React)│
               └──────────────────┘  └──────────────────┘
```

---

## 2. Estructura del Código del Proyecto (Doble Backend)

```
backend/
├── rust-core/                   # 🦀 Microservicio / Demonio en Rust
│   ├── Cargo.toml               # Dependencias (tokio, notify, lopdf, image, sha2, redis)
│   └── src/
│       ├── main.rs              # Punto de entrada y loop asíncrono tokio
│       ├── watcher.rs           # Folder watcher nativo sobre inotify/FSEvents
│       ├── hasher.rs            # Cálculo de hash SHA-256 en tiempo récord
│       ├── pdf_triage.rs        # Extractor vectorial y detector de texto digital
│       ├── img_preprocessor.rs  # Deskewing y normalización de contraste para escaneos
│       └── queue_publisher.rs   # Publicador de eventos hacia Redis
│
├── python-api/                  # 🐍 Backend de Negocio, Auditoría y API
│   ├── app/
│   │   ├── main.py              # FastAPI server y ciclo de vida
│   │   ├── core/
│   │   │   ├── config.py        # Configuración (Redis, DB, OpenAI Keys)
│   │   │   └── database.py      # SQLAlchemy Async Engine
│   │   ├── api/v1/
│   │   │   ├── documents.py     # Endpoints CRUD de documentos
│   │   │   ├── vendors.py       # Endpoints de proveedores y plantillas
│   │   │   ├── audit.py         # Endpoints de 1-Click Approval y correcciones
│   │   │   └── websockets.py    # Stream WebSocket de auditoría en vivo
│   │   ├── engine/
│   │   │   ├── spatial_engine.py# Anclas geométricas y Ray-Casting
│   │   │   ├── validator.py     # Motor aritmético determinista (±0.02)
│   │   │   ├── vendor_matcher.py# Auto-aprendizaje de plantillas
│   │   │   └── ai_fallback.py   # Fallback estructurado a gpt-4o-mini
│   │   ├── queue/
│   │   │   └── worker.py        # Consumidor asíncrono de tareas de Redis
│   │   ├── models/              # Modelos ORM
│   │   └── schemas/             # Esquemas Pydantic v2
│   └── requirements.txt
└── docker-compose.yml           # Orquestador local (Rust-Core + Python-API + Redis + DB)
```

---

## 3. Detalle de Responsabilidades: Rust vs. Python

### 3.1 🦀 Rust Core (Ingesta, Triage y Geometría)
1. **Folder Watcher de Consumo Cero:** Utiliza `notify` para suscribirse a eventos del kernel (`IN_CLOSE_WRITE`), permitiendo vigilar directorios con miles de archivos con < 10 MB de RAM.
2. **Deduplicación Flash:** Calcula el hash `SHA-256` en microsegundos antes de que el archivo toque la capa de negocio.
3. **Triage de Documentos:**
   - Si el PDF tiene texto embebido, `lopdf` / `pdfium` extrae la lista de palabras y sus coordenadas:
     `{"text": "FACTURA", "bbox": [100.5, 720.0, 180.2, 735.0]}`.
   - Si es imagen o escaneo, `image-rs` endereza el ángulo (deskewing) y aplica binarización Otsu para entregárselo limpio al OCR.
4. **Publicación en Redis:** Empaqueta el payload normalizado y lo inserta en la cola Redis (`LPUSH invoice_queue` o Redis Stream).

### 3.2 🐍 Python Engine (Negocio, Auditoría y API)
1. **Consumo de Cola:** Worker asíncrono toma los payloads geométricos generados por Rust.
2. **Reconocimiento por Plantilla:** Si el emisor ya tiene plantilla registrada, extrae los campos en < 2 ms por coordenadas directas.
3. **Parser Heurístico Espacial (Ray-Casting):** Si es un emisor nuevo, busca anclas (`TOTAL`, `SUBTOTAL`, `NIT`, `IVA`) proyectando rayos de proximidad horizontal y vertical.
4. **Auditoría Matemática Determinista:**
   - $\sum (\text{item\_qty} \times \text{unit\_price}) = \text{Subtotal}$
   - $\text{Subtotal} + \text{IVA} - \text{Retenciones} = \text{Total}$ (Margen de tolerancia $\pm 0.02$).
5. **Fallback Selectivo a OpenAI:** Solo se invoca si la confianza es $< 70\%$ o el documento está severamente deteriorado.
6. **Notificación en Vivo:** Envía el resultado procesado a la interfaz React mediante WebSockets.

---

## 4. API Endpoints Principales (FastAPI)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/documents/upload` | Subida manual de factura (PDF o Imagen). Encola en Redis. |
| `GET` | `/api/v1/documents/` | Lista paginada con filtros por estado Kono (Green/Yellow/Red). |
| `GET` | `/api/v1/documents/{id}` | Detalle completo de factura, ítems, Bounding Boxes y alertas. |
| `GET` | `/api/v1/documents/{id}/file` | Sirve el archivo binario original para el visor PDF. |
| `PUT` | `/api/v1/documents/{id}/approve` | Aprobación 1-Click y exportación a contabilidad. |
| `PUT` | `/api/v1/documents/{id}/correct` | Corrección manual y auto-generación de plantilla de proveedor. |
| `GET` | `/api/v1/vendors/{tax_id}/template` | Consulta reglas/coordenadas aprendidas de un emisor. |
| `WS` | `/api/v1/ws/audit-feed` | Stream WebSocket en tiempo real de documentos procesados. |

---

## 5. Orquestación y Despliegue con Docker Compose

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  rust-core:
    build: ./backend/rust-core
    environment:
      - REDIS_URL=redis://redis:6379
      - WATCH_DIR=/data/inbound_invoices
    volumes:
      - ./data:/data
    depends_on:
      - redis

  python-api:
    build: ./backend/python-api
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=sqlite+aiosqlite:///./kono.db
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    ports:
      - "8000:8000"
    volumes:
      - ./data:/data
    depends_on:
      - redis
```

