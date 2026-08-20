# US-REQ-004 — Base de Conocimiento de Anclas/Cabeceras en JSON Extendible
**Tipo:** Story | **SP:** 5 (borrador) | **Prioridad:** Alta | **Asignado:** Daniel
**Rama sugerida:** `feature/backend-knowledge-base-json`
**Capa:** 🐍 Python Engine

---

## 📖 Historia de Usuario
> "Como equipo, quiero que los sinónimos de anclas/cabeceras sean configurables en un JSON, para poder ampliar el vocabulario por país, negocio o ciudad sin tocar código, y resolver facturas que usan variantes como 'Invoice', 'bill', 'amount paid', 'total paid', etc."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] Se externalizan `ANCHOR_SYNONYMS` (spatial_engine) y `HEADER_KEYWORDS` (table_parser) a un archivo `knowledge_base.json`, cargado al inicio (backward compatible → mismo dict en memoria).
- [ ] Se amplían los sinónimos:
  - Tipo de documento: `invoice`, `bill`, `factura`, `recibo`, `receipt`, `comprobante`.
  - Total: `amount paid`, `total paid`, `payment due`, `total a pagar`, `valor a pagar`, `total`.
  - Variaciones por país/negocio/ciudad.
- [ ] **No cambia** la lógica de cómo se extrae cuando sí es factura (solo el vocabulario es externo/extensible).
- [ ] Agregar una ancla nueva al JSON = no requiere recompilar.
- [ ] Tests (carga del JSON, sinónimos nuevos detectados).

---

## 📋 Subtasks
- [ ] Crear `knowledge_base.json` + loader.
- [ ] Migrar `ANCHOR_SYNONYMS` y `HEADER_KEYWORDS` a consumir el JSON.
- [ ] Ampliar sinónimos (doc type, total, monetarios, país).
- [ ] Tests de carga y detección.

## 🔗 Dependencias
- **Provee**: vocabulario para HU-001 (clasificador) y HU-005 (clasificación correo).
- Independiente de otras; se recomienda hacer **antes** de 001/005.
