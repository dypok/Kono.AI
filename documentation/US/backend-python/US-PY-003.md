# US-PY-003 — API REST FastAPI, WebSockets en Tiempo Real & Exportación Contable
**Tipo:** Story | **SP:** 5 | **Prioridad:** Alta (P1) | **Asignado:** Dylan & Daniel (Compartida)
**Rama sugerida:** `feature/py-fastapi-crud-websockets-export`

---

## 📖 Historia de Usuario
> "Como interfaz de usuario (React) y sistema ERP contable, quiero endpoints REST para consultar, auditar, aprobar en 1-Click y exportar facturas, además de una conexión WebSocket que me transmita los documentos auditados en tiempo real, para operar sin retrasos ni recargas de página."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] Endpoints REST documentados y funcionales en `/docs` de FastAPI:
  - `POST /api/v1/documents/upload`: Subida directa de comprobantes con validación de tipo MIME (`application/pdf`, `image/png`, `image/jpeg`).
  - `GET /api/v1/documents/`: Listado paginado con filtros por `kono_state` (`GREEN`, `YELLOW`, `RED`), fecha y proveedor.
  - `GET /api/v1/documents/{id}`: Detalle completo con ítems, coordenadas BBox y lista de alertas.
  - `GET /api/v1/documents/{id}/file`: Streaming del archivo binario original para el visor PDF.
  - `PUT /api/v1/documents/{id}/approve`: Aprobación 1-Click que marca el documento como `APPROVED` y genera registro en `audit_logs`.
  - `PUT /api/v1/documents/{id}/correct`: Actualización de campos por corrección manual del usuario.
- [ ] Conexión WebSocket `WS /api/v1/ws/audit-feed` con broadcasting en tiempo real de eventos `DOCUMENT_PROCESSED` y `METRICS_UPDATE`.
- [ ] Endpoint `GET /api/v1/documents/export?format=csv|json`: Genera archivo descargable estructurado para importar en SAP/Oracle/Excel.
- [ ] Configuración de `docker-compose.yml` para levantar localmente el entorno completo (Rust Core + Python API + Redis + Base de Datos).

---

## 📋 Subtasks Desglosadas por Capa

### 🚀 [PY-FASTAPI] Controladores & Rutas REST
- [ ] Crear routers en `backend/python-api/app/api/v1/documents.py`, `vendors.py`, y `audit.py`.
- [ ] Implementar inyección de dependencias `get_db` con SQLAlchemy Async Session.
- [ ] Implementar subida de archivos multipart con streaming seguro a disco en `POST /upload`.
- [ ] Implementar generador de CSV con `pandas` / `csv` estándar en `GET /export`.

### ⚡ [PY-WEBSOCKETS] Canal en Tiempo Real
- [ ] Implementar `ConnectionManager` en `backend/python-api/app/api/v1/websockets.py`.
- [ ] Suscribirse al canal de eventos de Redis con `redis-py` async pub/sub (`kono_feed_channel`).
- [ ] Reenviar automáticamente a todos los clientes WebSocket conectados los nuevos documentos terminados.

### 🐳 [DEVOPS] Docker Compose & Configuración
- [ ] Crear `docker-compose.yml` en la raíz orquestando `redis:7-alpine`, `backend/rust-core/` y `backend/python-api/`.
- [ ] Configurar volúmenes compartidos para almacenamiento de archivos (`./data/storage:/data/storage`).
- [ ] Configurar variables de entorno y archivo `.env.example`.

### 🧪 [TESTS & POSTMAN]
- [ ] Crear suite de tests de API `tests/test_api_documents.py` con `httpx.AsyncClient`.
- [ ] Probar subida de lote de 10 archivos vía API y verificar recepción de mensajes por WebSocket.
