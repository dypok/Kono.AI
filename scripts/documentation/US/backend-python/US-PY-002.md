# US-PY-002 — Validador Aritmético Determinista, Fallback IA Opcional & Asignación de Estados Kono
**Tipo:** Story | **SP:** 8 | **Prioridad:** Alta (P0) | **Asignado:** Daniel
**Rama sugerida:** `feature/py-validator-ai-fallback-kono`

---

## 📖 Historia de Usuario
> "Como auditor financiero, quiero que el sistema audite con rigor matemático determinista (tolerancia $\pm 0.02$) la sumatoria de ítems, cálculo de impuestos y totales, asigne el estado Kono (🟢 Verde, 🟡 Amarillo, 🔴 Rojo) y utilice fallback selectivo a OpenAI solo ante dudas severas, para garantizar que ninguna factura con descuadre pase desapercibida."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] **Validación Matemática Determinista:**
  - $\sum (\text{quantity}_i \times \text{unit\_price}_i) = \text{calculated\_subtotal}$.
  - Comprobación de impuestos: $\text{calculated\_subtotal} + \text{tax\_total} - \text{withholding\_total} = \text{calculated\_total}$.
  - Margen de tolerancia de redondeo: $|\text{extracted\_total} - \text{calculated\_total}| \le 0.02$.
- [ ] **Asignación de Estado de la Mascota Kono:**
  - 🟢 **GREEN (Aprobado Automático):** Matemática exacta ($\Delta \le 0.02$), NIT con formato válido y sin duplicados.
  - 🟡 **YELLOW (Revisión por Excepción):** Descuadres de centavos ($\Delta > 0.02$), discrepancia en ítems o confianza de lectura $< 80\%$.
  - 🔴 **RED (Alerta Crítica / Bloqueo):** Duplicado detectado por SHA-256 o número de factura ya pagado en los últimos 180 días.
- [ ] **Fallback Selectivo a OpenAI (`gpt-4o-mini`):**
  - Se invoca **únicamente** si el motor determinista tiene un Score de Confianza $< 70\%$ o faltan campos obligatorios.
  - Utiliza `pydantic` y Structured Outputs (`response_format={"type": "json_object"}`).
  - Envía solamente el fragmento de texto/recuadro en conflicto, gastando $< 400$ tokens por llamada ($< \$0.0002\text{ USD}$).
- [ ] Persistencia de todas las alertas y deltas en la tabla `discrepancies`.

---

## 📋 Subtasks Desglosadas por Capa

### 🧮 [PY-VALIDATOR] Motor Aritmético Determinista
- [ ] Crear `backend/python-api/app/engine/validator.py` con clase `DeterministicValidator`.
- [ ] Implementar función `validate_invoice(extracted: ExtractedInvoice) -> AuditResult`.
- [ ] Validar algoritmo de dígito de verificación fiscal (RUT / NIT / RFC).
- [ ] Registrar cada discrepancia encontrada con su campo, valor esperado, valor extraído y delta monetario.

### 🤖 [PY-AI] Fallback Selectivo con OpenAI (`gpt-4o-mini`)
- [ ] Crear `backend/python-api/app/engine/ai_fallback.py` utilizando `openai` SDK y `pydantic`.
- [ ] Definir el JSON Schema estricto del contrato financiero (`KonoInvoiceSchema`).
- [ ] Implementar lógica de fallback selectivo: si falta un campo específico (ej. `issue_date` dudosa), solicitar a la IA solo ese campo.
- [ ] Medir y registrar el consumo de tokens y costo en cada ejecución para métricas.

### ⚙️ [PY-WORKER] Consumidor de Cola Redis & Pipeline End-to-End
- [ ] Implementar `backend/python-api/app/queue/worker.py` consumiendo eventos de `invoice_processing_stream`.
- [ ] Orquestar el flujo: `Desempaquetar Payload Rust` $\to$ `Spatial Engine` $\to$ `Validator` $\to$ `(Fallback si aplica)` $\to$ `Persistir en DB` $\to$ `Notificar WebSocket`.
- [ ] Guardar en `documents` y `invoice_items` con tiempo total de procesamiento (`processing_time_ms`).

### 🧪 [TESTS & VALIDACIÓN]
- [ ] Crear test unitario `tests/test_validator.py` probando casos con delta $0.00$ (Green), delta $0.05$ (Yellow) y duplicados (Red).
- [ ] Mockear llamadas de OpenAI en tests unitarios para no consumir saldo durante el CI/CD.
