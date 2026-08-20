# US-REQ-002 — Costo Estimado de Operación IA (Botón Manual)
**Tipo:** Story | **SP:** 8 (borrador) | **Prioridad:** Alta | **Asignado:** Daniel
**Rama sugerida:** `feature/backend-ai-cost-estimate`
**Capa:** 🐍 Python Engine

---

## 📖 Historia de Usuario
> "Como usuario, cuando una factura no pudo ser leída, quiero poder analizarla con IA y que antes de confirmar se me muestre cuánto me va a costar la operación, para decidir si conviene."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] `config.py` lee `OPENAI_API_KEY` y se habilita `openai` en `requirements.txt` (client inyectable en `AiFallback`).
- [ ] `AiFallback.estimate_cost()`: estima tokens (prompt + completion por longitud del fragmento) × precio por token de `gpt-4o-mini` → `estimated_cost_usd` (casi exacto).
- [ ] Endpoint `POST /api/v1/ai/cost-estimate` (por documento) → devuelve el costo estimado **sin ejecutar** la IA.
- [ ] Endpoint `POST /api/v1/ai/analyze` → ejecuta el fallback bajo demanda (solo desde el botón manual).
- [ ] Se persisten `ai_tokens`, `ai_cost_usd`, `needs_ai_fallback` en `Document` y se exponen en schemas.
- [ ] La IA **solo se invoca desde el botón manual** (no automáticamente) cuando no hay datos extraídos.
- [ ] Tests (costo con mock, sin consumir saldo).

---

## 📋 Subtasks
- [ ] Habilitar OpenAI client + config.
- [ ] `AiFallback.estimate_cost()` + tests de costo.
- [ ] Endpoints `cost-estimate` y `analyze`.
- [ ] Persistencia de costo en `Document`.

## 🔗 Dependencias
- **Provee**: endpoints de costo para HU-003 (lote) y HU-006 (export) y el frontend.
- **Depende de**: US-REQ-001 (señal de "no hay datos").
