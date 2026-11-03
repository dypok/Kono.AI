# US-REQ-009 — Estudio y Reducción de Latencia (1000+ ms)
**Tipo:** Story | **SP:** 8 (borrador) | **Prioridad:** Alta | **Asignado:** Daniel
**Rama sugerida:** `feature/backend-latency-optimization`
**Capa:** 🐍 Python Engine

---

## 📖 Historia de Usuario
> "Como usuario, quiero que la aplicación responda rápido, porque actualmente la latencia suele estar en 1000 ms o más."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] Perfilado de los endpoints de mayor uso (`/api/v1/documents/`, detalle, upload) y del pipeline (doble consumidor de la stream, fabricación de valores, `create_all`/sync engine en request, queries sin índices).
- [ ] Optimizaciones: índices DB (`vendor_tax_id`, `issue_date` ya existen; añadir los faltantes), eliminar trabajo síncrono del hot path, cache de listado, query de listado eficiente (sin `COUNT` pesado innecesario), debounce en frontend (depende de frontend).
- [ ] Benchmark antes/después de latencia p50/p95.
- [ ] Reducir la latencia por debajo del umbral acordado con el equipo.
- [ ] No romper los 45+ tests existentes.

---

## 📋 Subtasks
- [ ] Instrumentar/perfilar endpoints y pipeline.
- [ ] Optimizar queries e índices.
- [ ] Eliminar cuellos síncronos.
- [ ] Benchmark y comparativa.

## 🔗 Dependencias
- Independiente; se beneficia de no tener datos fabricados (HU-001). Backend primero.
