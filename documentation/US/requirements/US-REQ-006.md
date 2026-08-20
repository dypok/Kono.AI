# US-REQ-006 — Exportar al Correo con la misma Clasificación (Empresa/Tipo)
**Tipo:** Story | **SP:** 5 (borrador) | **Prioridad:** Media | **Asignado:** Daniel (backend) + Dylan (frontend)
**Rama sugerida:** `feature/export-correo-clasificado`
**Capa:** 🐍 Python Engine + ⚛️ Frontend

---

## 📖 Historia de Usuario
> "Como contador, quiero exportar un documento aprobado también al correo y que quede clasificado automáticamente bajo el mismo criterio (empresa/tipo de facturación), para tenerlo ordenado también en la bandeja de correo."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- **Backend (Daniel):**
  - [ ] Endpoint `POST /api/v1/documents/{id}/export-email` que envía el documento al correo y lo etiqueta `KONO_INVOICE/{Empresa}/{Debito|Credito}`.
  - [ ] Reutiliza la clasificación de US-REQ-005.
- **Frontend (Dylan):**
  - [ ] Botón de "Exportar al correo" en el detalle/bandeja que confirma antes de enviar.

---

## 📋 Subtasks
- Backend: endpoint de export a correo (Gmail API) con etiquetado.
- Frontend: botón + confirmación.

## 🔗 Dependencias
- **Depende de**: US-REQ-005 (clasificación correo). Backend primero, frontend después.
