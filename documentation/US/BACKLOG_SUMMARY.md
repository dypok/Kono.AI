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
| **[US-INT-001](integrations/US-INT-001.md)** | Integración de Flujos de Automatización n8n & Pipeline Inbound | `feature/integration-n8n-workflow-pipeline` | 5 | **Dylan** | 🤖 n8n Workflows |
| **[US-FRONT-001](frontend/US-FRONT-001.md)** | Visor Split-Screen con Bounding Boxes SVG Interactivos | `feature/front-split-screen-pdf-bboxes` | 8 | **Sayder** | ⚛️ Frontend React |
| **[US-FRONT-002](frontend/US-FRONT-002.md)** | Mascota Kono (Miss Minutes), Dashboard & Aprobación 1-Click | `feature/front-kono-mascot-batch-dashboard` | 8 | **Sayder** | ⚛️ Frontend React |
| **[US-FRONT-003](frontend/US-FRONT-003.md)** | Editor Interactivo de Plantillas (Point & Click Template Builder) | `feature/front-vendor-template-builder` | 5 | **Sayder** | ⚛️ Frontend React |

---

## 📊 Balance de Carga de Trabajo por Integrante

| Integrante | Historias Asignadas | Total Story Points (SP) | Rol Técnico Principal |
| :--- | :--- | :--- | :--- |
| **Sayder** | US-FRONT-001, US-FRONT-002, US-FRONT-003 | **21 SP** | Frontend Lead, SVG Canvas & UX Mascota |
| **Dylan** | US-RUST-001, US-RUST-003 (part), US-PY-001, US-PY-003 (part), US-INT-001 | **25.5 SP** | Rust Ingestion, Python Spatial Engine, API & n8n |
| **Daniel** | US-RUST-002, US-RUST-003 (part), US-PY-002, US-PY-003 (part), US-PY-004 | **23.5 SP** | Rust Triage/OCR, Python Validator, Fallback & Email |
| **TOTAL** | **11 Historias de Usuario Jira-Ready** | **70 SP** | **Proyecto Completo End-to-End** |
