# US-REQ-005 — Clasificación del Correo (Gmail) por Empresa → Tipo (Débito/Crédito)
**Tipo:** Story | **SP:** 8 (borrador) | **Prioridad:** Alta | **Asignado:** Daniel
**Rama sugerida:** `feature/backend-gmail-empresa-tipo`
**Capa:** 🐍 Python Engine (Gmail/IMAP)

---

## 📖 Historia de Usuario
> "Como contador que declara renta, quiero que los correos se clasifiquen por empresa y por tipo de facturación (débito/crédito), para ordenarlos y facilitar la declaración, y solo exportar a la aplicación cuando se confirme que es una factura."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] En `gmail_sync_service.py`, reemplazar la etiqueta única `KONO_INVOICE` por la jerarquía **Empresa → Tipo (Débito/Crédito)**:
  - Etiqueta: `KONO_INVOICE/{Empresa}/{Debito|Credito}`.
- [ ] Clasificar por **empresa** (de las anclas de proveedor) y luego **tipo de facturación** (débito = emisor le factura; crédito = nota crédito/egreso).
- [ ] **Solo exportar a la app cuando se confirme que es factura** (reusa clasificador US-REQ-001 + vocabulario US-REQ-004).
- [ ] Base de conocimiento de categorías (empresa/tipo) en el `knowledge_base.json` de US-REQ-004.
- [ ] Tests de clasificación con servidor IMAP mockeado.

---

## 📋 Subtasks
- [ ] Detección de empresa (proveedor) desde adjunto/asunto/cuerpo.
- [ ] Determinación de tipo débito/crédito.
- [ ] Creación de etiquetas jerárquicas en Gmail.
- [ ] Flujo: clasificar → etiquetar → (si es factura) exportar a la app.

## 🔗 Dependencias
- **Depende de**: US-REQ-001 (confirmar factura), US-REQ-004 (JSON de categorías).
- **Provee**: base para US-REQ-006 (export al correo).
