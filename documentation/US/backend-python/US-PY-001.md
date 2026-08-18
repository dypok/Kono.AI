# US-PY-001 — Motor Determinista Espacial (Ray-Casting), Tablas & Plantillas de Proveedor
**Tipo:** Story | **SP:** 8 | **Prioridad:** Alta (P0) | **Asignado:** Dylan
**Rama sugerida:** `feature/py-spatial-engine-vendor-templates`

---

## 📖 Historia de Usuario
> "Como analista contable de Kono.ai, quiero que el motor de Python procese las coordenadas espaciales recibidas de Rust, identifique los campos clave (Factura N°, Fecha, Emisor, Ítems, Totales) mediante proximidad de anclas o plantillas guardadas, para extraer los datos con 100% de exactitud y $0 costo de IA en el 95% de las facturas."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] Implementa el algoritmo geométrico de **Ray-Casting**:
  - Detecta palabras ancla (`TOTAL`, `SUBTOTAL`, `IVA`, `NIT`, `FACTURA N°`).
  - Proyecta búsqueda horizontal derecha ($X > X_a, |Y - Y_a| \le 12\text{ px}$) y vertical inferior ($Y > Y_a$) para capturar el valor asociado.
- [ ] Implementa el **Extractor Tabular de Ítems**:
  - Localiza el encabezado de la tabla (`Descripción`, `Cantidad`, `Precio Unitario`, `Total`).
  - Agrupa palabras que compartan la misma franja horizontal $Y$ para construir cada línea de detalle.
- [ ] **Gestión de Plantillas de Proveedor (`vendor_templates`):**
  - Consulta en SQLite/PostgreSQL si existe plantilla para el `tax_id` detectado.
  - Si existe: extrae directamente por coordenadas fijas en $< 2 \text{ ms}$.
  - Si no existe: ejecuta el parser espacial heurístico y permite persistir la plantilla si el usuario la confirma.
- [ ] Retorna el esquema Pydantic validado con los valores y sus Bounding Boxes normalizados `[x0, y0, x1, y1]`.

---

## 📋 Subtasks Desglosadas por Capa

### 🧭 [PY-ENGINE] Motor Espacial & Ray-Casting
- [ ] Crear `backend/python-api/app/engine/spatial_engine.py` con clases `SpatialWord`, `BoundingBox`, y `SpatialDocument`.
- [ ] Definir diccionario de sinónimos léxicos multirregionales para anclas (`TOTAL`, `SUBTOTAL`, `TAX/IVA`, `DATE`, `INVOICE_NUMBER`, `CUSTOMER`).
- [ ] Implementar función `find_value_near_anchor(anchor_name, direction="right|below", regex=None) -> ExtractedField`.
- [ ] Implementar extractor de fechas con soporte para formatos `DD/MM/YYYY`, `YYYY-MM-DD`, `DD-Mon-YYYY`.

### 📦 [PY-TABLES] Parser Determinista de Tablas
- [ ] Crear `backend/python-api/app/engine/table_parser.py`.
- [ ] Detectar la línea divisoria superior de la cabecera y el inicio de la sección de totales.
- [ ] Agrupar palabras intermedias por franjas de altura ($Y \pm 5\text{ px}$) para formar filas (`InvoiceItem`).
- [ ] Castear tipos numéricos (eliminar símbolos de moneda `$`, comas de miles y puntos decimales).

### 🏢 [PY-TEMPLATES] Auto-aprendizaje de Plantillas (`vendor_templates`)
- [ ] Crear modelo SQLAlchemy `VendorTemplate` en `backend/python-api/app/models/vendor.py`.
- [ ] Crear `backend/python-api/app/engine/vendor_matcher.py`:
  - Función `match_and_apply_template(tax_id, words) -> Optional[ExtractedInvoice]`.
  - Función `save_or_update_template(tax_id, user_corrections) -> VendorTemplate`.
- [ ] Implementar endpoint `GET /api/v1/vendors/{tax_id}/template` y `POST /api/v1/vendors/{tax_id}/template`.

### 🧪 [TESTS & VALIDACIÓN]
- [ ] Crear suite de pruebas `tests/test_spatial_engine.py` validando la extracción con los 3 PDFs generados por `scripts/invoices.py`.
- [ ] Validar que el tiempo de extracción por documento sea $< 15\text{ ms}$.
