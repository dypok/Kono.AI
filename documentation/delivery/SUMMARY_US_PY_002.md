# US-PY-002 — Validador Aritmético Determinista, Fallback IA & Estados Kono

**Historia de Usuario:** US-PY-002
**Asignado:** Daniel
**Rama:** `feature/py-validator-ai-fallback-kono`
**Versión:** 1.0.0 · **Fecha:** 18/08/2026
**Estándares:** `backend-architect` (diseño), `code-reviewer` (auto-revisión), SOLID/DRY,
validación de entrada, tests deterministas y offline (AI mockeada).

---

## 1. Resumen

US-PY-002 implementa el **núcleo de auditoría financiera determinista** de Kono.ai:

1. **Validación matemática** de cada factura (suma de ítems, impuestos y total) con
   **tolerancia de redondeo ±0.02**.
2. **Verificación del dígito de verificación fiscal** (NIT / RUT, algoritmo modulo-11).
3. **Asignación del estado de la mascota Kono**: 🟢 `GREEN`, 🟡 `YELLOW`, 🔴 `RED`.
4. **Fallback selectivo a IA** (`gpt-4o-mini`) solo ante dudas severas
   (confianza < 70% o campos faltantes), gastando < 400 tokens por llamada.
5. **Pipeline de procesamiento** (`worker`) que consume el stream de **Rust**
   (`invoice_processing_stream`) y orquesta: Desempaquetar → Spatial → Validar →
   (Fallback) → Persistir → Notificar WebSocket.

El diseño mantiene el **motor determinista 100% puro y offline**, desacoplado de la IA
opcional, para que el núcleo de negocio sea testable, determinista y sin costos de red.

---

## 2. Decisiones de Arquitectura (ADR)

### ADR-1 · Motor determinista puro y sin dependencias de red
Se creó `DeterministicValidator` como **clase sin estado y sin I/O**: recibe un
`ExtractedInvoice` y devuelve un `AuditResult`. No toca Redis, BD ni red. Esto permite
tests aislados y deterministas, y cumple el requisito de la US de que la IA sea **solo
un fallback opcional**, no el motor principal.

### ADR-2 · AI como capa desacoplada e inyectable
`AiFallback` recibe el *client* de OpenAI **por inyección de dependencias** (constructor)
y devuelve `None` si no hay client o si el parseo falla. Así:
- En CI/tests se inyecta un *fake* → **cero costo, cero llamadas reales**.
- En producción se inyecta el client real de `openai`.
- Ante cualquier error de la IA, el pipeline **degrada con gracia** (nunca crashea).

### ADR-3 · Structured Outputs y control de tokens
`AiFallback` usa `response_format={"type": "json_object"}` + `temperature=0` +
`max_tokens=400` y envía **solo el fragmento conflictivo** (≤ 600 caracteres), para
mantener la llamada por debajo del presupuesto de la US (< $0.0002).

### ADR-4 · Worker con lógica pura separada del bucle de consumo
`InvoiceProcessor.process_payload` es **puro** (testeable sin Redis): mapea el payload →
valida → (fallback) → produce el evento. `ProcessingWorker.run` es el **bucle async** que
consume el stream y solo se ejecuta con Redis vivo. Separación de responsabilidades que
permite testear la lógica de negocio sin infraestructura.

### ADR-5 · Contrato único de auditoría
`app/schemas/audit.py` define `KonoState`, `Discrepancy(Kind)`, `AuditResult` y
`ExtractedInvoice`. Este contrato se reutiliza por el validador, la API (PY-003) y el
WebSocket — evita acoplamiento entre capas (DRY) y alinea los estados con `db_v0.md`.

---

## 3. Estructura del Código (nuevo en esta US)

```
backend/python-api/app/
├── schemas/
│   ├── __init__.py
│   └── audit.py              # KonoState, Discrepancy, DiscrepancyKind, AuditResult, ExtractedInvoice
├── engine/
│   ├── __init__.py
│   ├── validator.py          # DeterministicValidator (núcleo determinista)
│   └── ai_fallback.py        # AiFallback (IA selectiva, inyectable/mockeable)
├── queue/
│   ├── __init__.py
│   └── worker.py             # InvoiceProcessor + ProcessingWorker
└── __init__.py
```

---

## 4. Validación Matemática Determinista (`validator.py`)

### 4.1 Reglas (criterios de aceptación)
```python
calculated_subtotal = Σ (quantity_i × unit_price_i)
calculated_total   = parsed_subtotal + parsed_tax_total - parsed_withholding_total
|extracted - calculated| ≤ 0.02   →  aceptado (tolerancia de redondeo)
```

`DeterministicValidator.validate_invoice(invoice)`:
1. Recalcula el **subtotal** desde los ítems.
2. Valida cada **total de línea** (`qty × price`).
3. Compara subtotal recalculado vs declarado (`subtotal_delta`).
4. Calcula el **total** con impuestos/retenciones y lo compara (`total_delta`).
5. Valida el **NIT** (dígito de verificación, ver sección 5).
6. Registra **discrepancias** tipadas (`DiscrepancyKind`) con campo, esperado, extraído y delta.
7. Calcula el **score de confianza** (0..1) penalizando por discrepancia.

### 4.2 Asignación de estado Kono
| Estado | Condición |
| :--- | :--- |
| 🔴 **RED** | Duplicado (SHA-256) o número de factura ya usado |
| 🟡 **YELLOW** | Descuadre de centavos (> 0.02), discrepancia de ítems, confianza < 0.80, NIT inválido/faltante |
| 🟢 **GREEN** | Matemática exacta (≤ 0.02), NIT válido, sin conflictos |

### 4.3 Discrepancias tipadas
```python
DiscrepancyKind:
  SUBTOTAL_MISMATCH, TAX_MISMATCH, TOTAL_MISMATCH, ITEM_TOTAL_MISMATCH,
  DUPLICATE_HASH, DUPLICATE_INVOICE_NUMBER, LOW_CONFIDENCE, INVALID_TAX_ID, MISSING_FIELD
```
Cada `Discrepancy` guarda `field`, `kind`, `expected`, `extracted`, `delta` y `message`
→ listo para persistir en la tabla `discrepancies` de `db_v0.md`.

---

## 5. Dígito de Verificación Fiscal (NIT / RUT)

`DeterministicValidator.is_valid_tax_id` implementa el **módulo-11 colombiano**:

- Pesos descendentes `[71,67,59,53,47,43,41,37,29,23,19,17,13,7,3]` aplicados de
  **derecha a izquierda** sobre los dígitos del NIT base (excluyendo el dígito de
  verificación).
- `residuo = suma % 11` → DV esperado: `0 → 0`, `1 → 9`, `2..10 → 11 - residuo`.
- Válido si el último dígito separado por guion coincide.

> **Nota de testing:** durante la validación se detectó que el vector de prueba inicial
> (`900123456-5`) era un **dígito incorrecto**; el DV correcto de `900123456` es `8`.
> Se corrigió el vector y se documentó en el changelog. (Lección: no hardcodear dígitos
> de verificación sin verificarlos — usar vectores calculados/verificados.)

---

## 6. Fallback Selectivo a IA (`ai_fallback.py`)

`AiFallback.request_fallback(invoice, conflicting_fields)`:
- Construye un prompt **mínimo** con solo el fragmento conflictivo (≤ 600 chars).
- Llama a `gpt-4o-mini` con `response_format={"type":"json_object"}`, `temperature=0`,
  `max_tokens=400`.
- Parsea la respuesta al estricto `KonoInvoiceSchema` (Pydantic).
- **Degrada a `None`** si: no hay client, no hay contenido JSON, o todos los campos
  quedaron `None` → el pipeline conserva las discrepancias originales.

`do_ai` se dispara **solo** cuando `result.needs_ai_fallback == True`
(score determinista < 0.70 o falta de campos obligatorios).

---

## 7. Pipeline Worker (`queue/worker.py`)

- `InvoiceProcessor` (puro): `map_payload_to_invoice` (payload Rust → `ExtractedInvoice`)
  → `process_payload` (guión completo, opcionalmente publica evento).
- `ProcessingWorker` (async): `run(group, delay)` lee `invoice_processing_stream` (vía
  `XREADGROUP`) y despacha a `InvoiceProcessor`. Publica en `kono_feed_channel` el evento:
  ```json
  {
    "type": "DOCUMENT_PROCESSED",
    "document_id": "...",
    "kono_state": "GREEN",
    "calculated_subtotal": 700.0,
    "calculated_total": 833.0,
    "confidence_score": 1.0,
    "discrepancies": [...]
  }
  ```
  Ese canal lo consumirá el WebSocket de **US-PY-003** para broadcasting en tiempo real.

---

## 8. Testing y Verificación

Todos los tests corren en **entorno limpio** (Docker `python:3.11-slim`) y son **offline**
(IA y Redis mockeados/ausentes). Resultado: **24/24 tests en verde**.

| Archivo | Cobertura |
| :--- | :--- |
| `tests/test_validator.py` | Green (delta 0), Green (tolerancia), Yellow (total >0.05), Yellow (ítem), Yellow (confianza), Yellow (NIT inválido), Red (duplicado), dígito NIT válido/inválido, summarize |
| `tests/test_ai_fallback.py` | prompt mínimo, sin client → None, parseo structured JSON, JSON inválido → None, límite de tokens (mock de OpenAI) |
| `tests/test_worker.py` | pipeline Green + publica evento, fallback en baja confianza, `handle_event` puro, mapping de payload |

Además, los **5 tests de US-PY-001** (spatial/table/vendor) siguen pasando → no se rompió
nada existente.

---

## 9. Seguridad y Buenas Prácticas

- **Sin secretos hardcodeados**: la API key de OpenAI se inyecta por client (vía entorno en
  producción), nunca en el código.
- **Validación de entrada** en los límites (Pydantic models).
- **Degradación con gracia** de la IA: un fallo de red nunca crashea el pipeline.
- **Tests deterministas y aislados**, con mocks para no consumir saldo en CI/CD.
- Funciones < 200 líneas, complejidad baja, nombres descriptivos (revisión `code-reviewer`).

---

## 10. Integración con el resto del proyecto

- **Entra**: consume `invoice_processing_stream` (payload de US-RUST-002 / Daniel).
- **Sale**: emite eventos en `kono_feed_channel` → consumido por el WebSocket de
  **US-PY-003**.
- **Reutiliza**: `ExtractedInvoiceItem` (de PY-001 de Dylan), `BoundingBox`/spatial
  schemas.
- **Persiste**: los `AuditResult`/`Discrepancy` alimentarán `documents`, `invoice_items`
  y `discrepancies` de la capa de BD que construirá **US-PY-003**.

---

*Documento mantenido con el protocolo de changelog del workspace. Toda modificación
debe registrarse en `documentation/changelog/`.*
