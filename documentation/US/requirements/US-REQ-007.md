# US-REQ-007 — Bandeja de Auditoría: Multiselección, Delete en Lote, Filtro por Año y Paginación
**Tipo:** Story | **SP:** 8 (borrador) | **Prioridad:** Alto | **Asignado:** Dylan
**Rama sugerida:** `feature/front-bandeja-auditoria-mejoras`
**Capa:** ⚛️ Frontend React

---

## 📖 Historia de Usuario
> "Como usuario, quiero una bandeja de auditoría con selección múltiple, borrado en lote, filtro por año y paginación, para gestionar muchas facturas de forma rápida y ordenada."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] **Multiselección**: checkboxes por fila + "seleccionar todo" + barra de acciones masivas.
- [ ] **Delete en lote**: endpoint `POST /api/v1/documents/bulk-delete` (backend de Daniel) + modal de confirmación masiva.
- [ ] **Filtro por año** (+ `date_from/to` en backend si aplica) y **paginación visible** (el backend ya devuelve `total_pages`).
- [ ] Búsqueda con **debounce** (rendimiento).
- [ ] Reemplazar `alert()` nativo por toasts consistentes (mejorar `useToast`/`Toast` a multi-mensaje).
- [ ] **Refactorizar `frontend/src/lib/`**: eliminar dependencias rotas (crear `cn.ts`, quitar `mockData`/`supabaseClient` del flujo o reemplazarlos) para que el proyecto compile.
- [ ] Tests/verificación de build.

---

## 📋 Subtasks
- [ ] Refactorizar `lib/` (bloqueante del build).
- [ ] Checkboxes + Set<id> + seleccionar todo.
- [ ] Modal de delete masivo + endpoint bulk-delete.
- [ ] Filtro por año + paginación.
- [ ] Debounce de búsqueda + toasts.

## 🔗 Dependencias
- **Backend**: endpoint `bulk-delete` y filtro por año (Daniel) primero.
- **Bloqueante**: resolver `frontend/src/lib/` para que compile.
