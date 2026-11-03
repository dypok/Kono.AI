# US-REQ-001 — Identificación y Clasificación de Documentos no-Factura
**Tipo:** Story | **SP:** 8 (borrador) | **Prioridad:** Alta | **Asignado:** Daniel
**Rama sugerida:** `feature/backend-document-classifier`
**Capa:** 🐍 Python Engine

---

## 📖 Historia de Usuario
> "Como contador, quiero que el sistema identifique si un documento realmente es una factura antes de procesarlo, para que los PDFs que NO son facturas (contratos, cartas, boletas no-fiscales) no se registren como facturas con datos fabricados."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] Se crea un clasificador (`document_classifier.py`) que, sobre las `words` del payload de Rust, puntúe anclas de factura y devuelva `document_type` (`INVOICE` | `RECEIPT` | `OTHER`) + `score` de probabilidad.
- [ ] Reutiliza la base de conocimiento de anclas (US-REQ-004, JSON).
- [ ] Se inserta en el pipeline (`redis_pipeline_consumer.py` y `worker.py`) **sin modificar** el motor de extracción cuando sí es factura.
- [ ] Se **deja de fabricar valores** (`FAC-xxxx`, NIT falso `900123456-1`, fecha de hoy, totales 0) cuando `document_type == OTHER`.
- [ ] Columna `document_type` en `Document` + schema + listado/endpoint.
- [ ] Un PDF sin anclas de factura → `document_type=OTHER`, estado visible, mensaje "No se encontraron datos de factura".
- [ ] Tests (45 existentes siguen verdes + nuevos del clasificador).

---

## 📋 Subtasks
- [ ] `app/engine/document_classifier.py`: scoring por anclas.
- [ ] Integrar en `redis_pipeline_consumer.py` y `worker.py`.
- [ ] Modelo/schema: columna `document_type`.
- [ ] Endpoint listado con filtro por `document_type`.
- [ ] Tests `tests/test_document_classifier.py`.

## 🔗 Dependencias
- **Provee**: señal para HU-002 (mensaje no-data), HU-003 (conteo de fallos), HU-008 (visor).
- **Depende de**: US-REQ-004 (JSON de anclas).
