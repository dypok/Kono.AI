# US-REQ-003 — Lote: Resumen de Fallos + Análisis IA con Costo Total
**Tipo:** Story | **SP:** 5 (borrador) | **Prioridad:** Media | **Asignado:** Daniel (backend) + Dylan (frontend)
**Rama sugerida:** `feature/ai-batch-cost-analysis`
**Capa:** 🐍 Python Engine + ⚛️ Frontend

---

## 📖 Historia de Usuario
> "Como analista, cuando reviso un lote de varios archivos, quiero saber cuántos no pudieron leerse y poder analizarlos con IA mostrando el costo total estimado antes de confirmar."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- **Backend (Daniel):**
  - [ ] Endpoint de conteo de fallos por lote (cuántos `document_type == OTHER` / no leídos).
  - [ ] `POST /api/v1/ai/cost-estimate/batch` → costo total estimado (suma de HU-002).
  - [ ] `POST /api/v1/ai/analyze/batch` → ejecuta IA sobre los documentos fallidos bajo demanda.
- **Frontend (Dylan):**
  - [ ] Al procesar lote, mostrar cuántos archivos no se pudieron leer.
  - [ ] Botón "Analizar con IA por lote" que muestre el **costo total estimado** antes de confirmar.

---

## 📋 Subtasks
- Backend: endpoints de conteo de fallos + costo de lote + análisis de lote.
- Frontend: UI de resumen de lote + modal de confirmación de costo.

## 🔗 Dependencias
- **Depende de**: HU-001 (document_type), HU-002 (costo) — backend primero.
- **Frontend** (Dylan) se hace tras el backend.
