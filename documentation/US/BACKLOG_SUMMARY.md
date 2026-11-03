# 📊 Kono.ai — Backlog Jira-Ready Integral (10 Historias de Usuario)

> **Sprint 1 (Épicas 1 & 2):** Motor Dual-Backend (Rust Core + Python Spatial Engine), OCR Local & Visor Split-Screen SVG  
> **Sprint 2 (Épicas 3, 4 & 5):** Validador Aritmético Determinista, Mascota Kono, Multi-Canal Inbound (Gmail/n8n) & Editor de Plantillas Point & Click

---

## ✅ DEFINITION OF DONE (DoD) Global — Aplica a TODAS las Historias

Antes de mover cualquier Story a **"Done"** en Jira, se deben cumplir TODOS estos puntos:

- [ ] El código está en una rama `feature/` propia del integrante responsable.
- [ ] Se abrió y aprobó un Pull Request hacia `develop` con al menos 1 revisión de código.
- [ ] Los commits siguen el formato convencional (`feat:`, `fix:`, `docs:`, `perf:`, etc.).
- [ ] Los criterios de aceptación específicos de la US están 100% cumplidos y verificados con tests automatizados.
- [ ] No hay errores en la consola del navegador ni en los logs de Rust/Python.
- [ ] Los endpoints funcionan correctamente y están documentados en `/docs` de FastAPI.
- [ ] El componente visual coincide con la especificación de UX/UI y el visor SVG está calibrado.
- [ ] Las variables secretas (`.env`) nunca se suben al repositorio.
- [ ] El integrante puede explicar y defender técnicamente el código desarrollado.

---

## 👥 Matriz de Asignación y Resumen del Backlog

| Código US | Título de la Historia | Rama Sugerida | SP | Asignado | Capa |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[US-RUST-001](backend-rust/US-RUST-001.md)** | Daemon Folder Watcher & Deduplicador Flash SHA-256 | `feature/rust-folder-watcher-hasher` | 5 | **Dylan** | 🦀 Rust Core |
| **[US-RUST-002](backend-rust/US-RUST-002.md)** | Fast PDF Triage, Pre-procesamiento Imagen & Publicador Redis | `feature/rust-pdf-triage-img-preprocessor` | 8 | **Daniel** | 🦀 Rust Core |
| **[US-RUST-003](backend-rust/US-RUST-003.md)** | Pipeline Ingesta Masiva, Concurrencia & Resiliencia I/O | `feature/rust-concurrency-resilience-pipeline` | 5 | **Dylan & Daniel** | 🦀 Rust Core |
| **[US-PY-001](backend-python/US-PY-001.md)** | Motor Espacial (Ray-Casting), Tablas & Plantillas | `feature/py-spatial-engine-vendor-templates` | 8 | **Dylan** | 🐍 Python Engine |
| **[US-PY-002](backend-python/US-PY-002.md)** | Validador Aritmético (±0.02), Fallback IA & Estados Kono | `feature/py-validator-ai-fallback-kono` | 8 | **Daniel** | 🐍 Python Engine |
| **[US-PY-003](backend-python/US-PY-003.md)** | API REST FastAPI, WebSockets en Tiempo Real & Exportación | `feature/py-fastapi-crud-websockets-export` | 5 | **Dylan & Daniel** | 🐍 Python Engine |
| **[US-PY-004](backend-python/US-PY-004.md)** | Conector Inbound Multi-Canal (Gmail / IMAP & Webhook n8n) | `feature/py-inbound-email-webhooks` | 5 | **Daniel** | 🐍 Python Engine |
| **[US-INT-001](integrations/US-INT-001.md)** | Webhook Inbound Nativo REST (HMAC SHA-256) & Ingesta ERPs | `feature/integration-rest-webhook-pipeline` | 5 | **Dylan** | 🤖 Webhooks REST |
| **[US-FRONT-001](frontend/US-FRONT-001.md)** | Visor Split-Screen con Bounding Boxes SVG Interactivos | `feature/front-split-screen-pdf-bboxes` | 8 | **Sayder** | ⚛️ Frontend React |
| **[US-FRONT-002](frontend/US-FRONT-002.md)** | Mascota Kono (Miss Minutes), Dashboard & Aprobación 1-Click | `feature/front-kono-mascot-batch-dashboard` | 8 | **Sayder** | ⚛️ Frontend React |
| **[US-FRONT-003](frontend/US-FRONT-003.md)** | Editor Interactivo de Plantillas (Point & Click Template Builder) | `feature/front-vendor-template-builder` | 5 | **Sayder** | ⚛️ Frontend React |
| **[US-FRONT-004](frontend/US-FRONT-004.md)** | Rediseño Global Liquid Glass, Enrutamiento SPA, Login Mock & Sidebar | `feature/front-liquid-glass-routing-layout` | 8 | **Sayder & Dylan** | ⚛️ Frontend React |

> **Sprint 3 (Mejoras conversadas con Team Lead):**

| **[US-REQ-001](requirements/US-REQ-001.md)** | Identificación y Clasificación de Documentos no-Factura | `feature/backend-document-classifier` | 8 | **Daniel** | 🐍 Python |
| **[US-REQ-002](requirements/US-REQ-002.md)** | Costo Estimado de Operación IA (Botón Manual) | `feature/backend-ai-cost-estimate` | 8 | **Daniel** | 🐍 Python |
| **[US-REQ-003](requirements/US-REQ-003.md)** | Lote: Resumen de Fallos + Análisis IA con Costo Total | `feature/ai-batch-cost-analysis` | 5 | **Daniel & Dylan** | 🐍+⚛️ |
| **[US-REQ-004](requirements/US-REQ-004.md)** | Base de Conocimiento de Anclas/Cabeceras en JSON Extendible | `feature/backend-knowledge-base-json` | 5 | **Daniel** | 🐍 Python |
| **[US-REQ-005](requirements/US-REQ-005.md)** | Clasificación del Correo (Gmail) por Empresa → Tipo (Débito/Crédito) | `feature/backend-gmail-empresa-tipo` | 8 | **Daniel** | 🐍 Python |
| **[US-REQ-006](requirements/US-REQ-006.md)** | Exportar al Correo con la misma Clasificación (Empresa/Tipo) | `feature/export-correo-clasificado` | 5 | **Daniel & Dylan** | 🐍+⚛️ |
| **[US-REQ-007](requirements/US-REQ-007.md)** | Bandeja de Auditoría: Multiselección, Delete en Lote, Filtro Año & Paginación | `feature/front-bandeja-auditoria-mejoras` | 8 | **Dylan** | ⚛️ Frontend |
| **[US-REQ-008](requirements/US-REQ-008.md)** | UX/UI: Visor Opcional (quitar preview inline) + Mejoras Sidebar | `feature/front-viewer-opcional-sidebar` | 5 | **Dylan** | ⚛️ Frontend |
| **[US-REQ-009](requirements/US-REQ-009.md)** | Estudio y Reducción de Latencia (1000+ ms) | `feature/backend-latency-optimization` | 8 | **Daniel** | 🐍 Python |

---

## 📊 Balance de Carga de Trabajo por Integrante

| Integrante | Historias Asignadas | Total Story Points (SP) | Rol Técnico Principal |
| :--- | :--- | :--- | :--- |
| **Sayder** | US-FRONT-001, US-FRONT-002, US-FRONT-003, US-FRONT-004 (part) | **25 SP** | Frontend Lead, SVG Canvas & UX Mascota (sin HU nuevas) |
| **Dylan** | US-RUST-001, US-RUST-003 (part), US-PY-001, US-PY-003 (part), US-INT-001, US-FRONT-004 (part), US-REQ-003 (part), US-REQ-006 (part), US-REQ-007, US-REQ-008 | **45 SP** | Rust, Python Engine, API, n8n & Frontend |
| **Daniel** | US-RUST-002, US-RUST-003 (part), US-PY-002, US-PY-003 (part), US-PY-004, US-REQ-001, US-REQ-002, US-REQ-003 (part), US-REQ-004, US-REQ-005, US-REQ-006 (part), US-REQ-009 | **68 SP** | Rust Triage/OCR, Python Validator, Fallback, Email & Optimización |
| **TOTAL** | **21 Historias de Usuario** | **138 SP** | **Proyecto Completo End-to-End** |
