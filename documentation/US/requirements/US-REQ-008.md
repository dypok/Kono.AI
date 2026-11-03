# US-REQ-008 — UX/UI: Visor Opcional (quitar previsualización inline) + Mejoras de Sidebar
**Tipo:** Story | **SP:** 5 (borrador) | **Prioridad:** Media | **Asignado:** Dylan
**Rama sugerida:** `feature/front-viewer-opcional-sidebar`
**Capa:** ⚛️ Frontend React

---

## 📖 Historia de Usuario
> "Como usuario y Team Lead, quiero dejar de previsualizar el documento en la misma página (porque distrae y consume) y en su lugar ofrecer un botón que abra el documento en otra ventana o modal. Además, quiero un sidebar más cómodo para navegar."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] Quitar el visor `<iframe>` inline (split-screen) por defecto de la página de auditoría.
- [ ] Botón **"Ver documento"** que abra el PDF en otra pestaña/modal (opcional).
- [ ] Mantener descarga / pantalla completa / desbloqueo de PDF protegido.
- [ ] Mejoras UX/UI del **sidebar**: estados activos claros, accesibilidad, colapso, jerarquía de navegación (dashboard/history/templates/analytics/settings).
- [ ] Si el documento no tiene datos (HU-001), mostrar "No se encontraron datos" + botón "Analizar con IA" (HU-002/003).
- [ ] Build compila (tras refactor `lib/`).

---

## 📋 Subtasks
- [ ] Remover visor inline del flujo principal; componente opcional.
- [ ] Botón de apertura en otra ventana/modal.
- [ ] Rediseño/mejoras del sidebar.
- [ ] Integrar estado vacío + botón IA (depende del backend de HU-001/002).

## 🔗 Dependencias
- **Depende del backend** (HU-001 "no se encontraron datos", HU-002 botón IA/costo).
- **Bloqueante**: resolver `frontend/src/lib/` (HU-007).
