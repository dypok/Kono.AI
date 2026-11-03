# Documento de Especificación de Negocio y Lógica Operativa: Kono.ai

**Versión:** 1.0.0 (MVP)  
**Fecha:** Agosto 2026  
**Estado:** Aprobado para Desarrollo  
**Producto:** Kono.ai (Extractor, Validador y Reconciliador Inteligente de Facturas y Comprobantes)

---

## 1. Resumen Ejecutivo y Visión del Producto

### 1.1 Identidad de Marca y Concepto
**Kono.ai** nace de la raíz *"conocer / conocimiento de datos"*. Es una plataforma de automatización de cuentas por pagar (AP Automation) y reconciliación contable orientada a eliminar la digitación manual, los errores aritméticos invisibles y el riesgo de fraude en el procesamiento de facturas y comprobantes.

* **Mascota de la Marca:** Una moneda animada e interactiva (con estilo y expresividad inspirados en *Miss Minutes*). La moneda actúa como el auditor visual del sistema:
  * **Verde (Feliz / Guiño):** Factura íntegra, comprobación matemática determinista al 100%, sin duplicados.
  * **Amarillo (Alerta / Lupa):** Discrepancias aritméticas leves, problemas de redondeo, impuestos inconsistentes o datos incompletos.
  * **Rojo (Detective / Brazos cruzados):** Alerta crítica de duplicado semántico, NIT/RUT no coincidente o posible inconsistencia fiscal grave.

### 1.2 Declaración de Valor Central
> *"Cero digitación, cero descuadres: Kono procesa, audita y concilia tus facturas antes de que toquen tus libros contables."*

---

## 2. Definición del Problema y Principios de Diseño del MVP

### 2.1 El Problema Operativo
Los departamentos financieros y contables reciben facturas en formatos PDF heterogéneos (vectoriales nativos, escaneos de baja resolución, fotografías móviles, tickets de caja). El procesamiento manual genera:
1. Cuellos de botella en cierres de mes.
2. Errores de digitación en subtotales, retenciones e impuestos.
3. Doble pago de facturas idénticas o ligeramente modificadas.
4. Pérdida de trazabilidad entre lo recibido por correo y lo registrado en el ERP.

### 2.2 Principios Rectores de Ingeniería y Negocio

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PRINCIPIOS CLAVE KONO.AI                       │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Priorizar determinismo sobre IA (Cálculos en código, no en LLM).     │
│ 2. Eficiencia extrema de tokens (Triage de documentos + Schemas).      │
│ 3. Asincronismo total (n8n para ingesta y orquestación sin bloqueos).   │
│ 4. Human-in-the-Loop enfocado exclusivamente en excepciones.           │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Determinismo Estricto sobre IA:** La IA **nunca** realiza sumatorias, cálculo de impuestos ni validaciones lógicas. La IA actúa exclusivamente como extractor semántico de alta precisión. Las reglas de negocio y matemáticas se ejecutan mediante código determinista (Python/Node.js).
2. **Eficiencia en Consumo de Tokens:**
   - **Triage de Formato:** Separación previa entre PDFs con texto digital y documentos escaneados/imágenes. Si el texto existe nativamente, se extrae vía parser de texto antes de invocar visión multimodal.
   - **Single-Pass Extraction:** Extracción en un solo paso con Structured Outputs (JSON Schema estricto), sin respuestas conversacionales ni preámbulos.
3. **Respuesta Rápida y Procesamiento Asíncrono:** La ingesta y procesamiento se delegan a colas asíncronas orquestadas por n8n. El usuario nunca experimenta latencia de espera bloqueante.
4. **Detección Semántica y Vectorial:** Uso de embeddings para identificar facturas duplicadas o conceptos repetidos con descripciones variables.

---

## 3. Arquitectura Funcional y Flujo de Procesamiento

```
                 [Proveedor / Empleado]
                           │
                           ▼ (Envío de Factura / Ticket)
                  [Gmail / Bandeja Inbound]
                           │
                           ▼ (Trigger Polling / Webhook)
                   [Orquestador n8n]
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      [Guarda Adjunto en         [Triage de Documento]
       Storage S3/Local]                 │
                                ┌────────┴────────┐
                                ▼                 ▼
                         [Texto Nativo]     [Escaneo/Imagen]
                                │                 │
                         (Parser Ligero)   (Visión Multimodal)
                                │                 │
                                └────────┬────────┘
                                         ▼
                             [Extracción JSON Schema]
                                         │
                                         ▼
                         [Motor de Validación Determinista]
                                 ├── Aritmética exacta
                                 ├── Verificación fiscal (ID/Tax)
                                 └── Búsqueda vectorial duplicados
                                         │
                                         ▼
                             [Persistencia & Estados]
                                         │
                                         ▼
                            [Dashboard Split-Screen]
                           (Revisión por Excepción)
                                         │
                                         ▼
                             [Exportación CSV/JSON/ERP]
```

### 3.1 Etapa 1: Ingesta Automatizada (n8n)
- **Monitoreo:** n8n vigila la cuenta de correo corporativo mediante disparador de Gmail/IMAP.
- **Filtrado:** Detecta adjuntos en formatos válidos (`.pdf`, `.png`, `.jpg`, `.jpeg`).
- **Almacenamiento:** Persiste el archivo en el bucket de almacenamiento seguro con un identificador único global (`document_id: UUIDv4`).
- **Encolamiento:** Emite un evento asíncrono hacia el motor de extracción.

### 3.2 Etapa 2: Triage y Extracción Estructurada
- **Análisis de Capa de Texto:** Se inspecciona el archivo con librerías nativas (`pdfplumber` / `pypdf`).
  - *Si contiene texto estructurado:* Se extrae el payload textual y se envía a un modelo de texto con prompt compacto.
  - *Si es imagen o escaneo:* Se envía la imagen normalizada a un modelo multimodal.
- **Schema Estricto:** La salida de la IA está forzada a cumplir el contrato de datos JSON definido, sin texto libre.

### 3.3 Etapa 3: Motor Determinista de Validación
El núcleo de reglas evalúa el payload JSON con las siguientes comprobaciones:

1. **Consistencia de Líneas de Detalle:**
   $$	ext{item\_total}_i = 	ext{quantity}_i 	imes 	ext{unit\_price}_i$$
   $$	ext{calculated\_subtotal} = \sum_{i=1}^{n} 	ext{item\_total}_i$$

2. **Consistencia de Impuestos y Total:**
   $$	ext{calculated\_total} = 	ext{subtotal} + 	ext{tax\_amount} - 	ext{withholding\_amount}$$

3. **Margen de Tolerancia de Redondeo:**
   Se permite una discrepancia máxima de $\pm 0.02$ unidades monetarias por efectos de redondeo en decimales. Si $|	ext{extracted\_total} - 	ext{calculated\_total}| > 0.02$, se marca discrepancia.

4. **Validación de Identificador Fiscal:**
   - Comprobación de longitud y formato de ID tributario (NIT, RUT, RFC, NIF) mediante expresiones regulares y algoritmo de dígito de verificación si aplica.

5. **Detección de Duplicados vía Embeddings:**
   - Generación de embedding vectorial sobre la tupla de metadatos:
     $$ec{V} = 	ext{Embed}(	ext{issuer\_tax\_id} + 	ext{invoice\_number} + 	ext{total\_amount} + 	ext{date} + 	ext{summary\_items})$$
   - Búsqueda por similitud de coseno en la base de datos vectorial contra documentos procesados en los últimos 180 días.
   - Si $	ext{Cosine Similarity} \ge 0.95$, se emite alerta crítica de posible duplicado.

---

## 4. Esquema de Datos del Negocio (JSON Contract)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "KonoInvoicePayload",
  "type": "object",
  "required": [
    "document_id",
    "invoice_number",
    "issue_date",
    "currency",
    "issuer",
    "customer",
    "items",
    "financials"
  ],
  "properties": {
    "document_id": { "type": "string", "format": "uuid" },
    "invoice_number": { "type": "string" },
    "issue_date": { "type": "string", "format": "date" },
    "due_date": { "type": ["string", "null"], "format": "date" },
    "currency": { "type": "string", "enum": ["USD", "EUR", "COP", "MXN", "CLP", "PEN", "ARS"] },
    "issuer": {
      "type": "object",
      "required": ["name", "tax_id"],
      "properties": {
        "name": { "type": "string" },
        "tax_id": { "type": "string" },
        "address": { "type": ["string", "null"] },
        "email": { "type": ["string", "null"] }
      }
    },
    "customer": {
      "type": "object",
      "required": ["name", "tax_id"],
      "properties": {
        "name": { "type": "string" },
        "tax_id": { "type": "string" }
      }
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["description", "quantity", "unit_price", "total_price"],
        "properties": {
          "description": { "type": "string" },
          "quantity": { "type": "number" },
          "unit_price": { "type": "number" },
          "tax_rate": { "type": ["number", "null"] },
          "total_price": { "type": "number" }
        }
      }
    },
    "financials": {
      "type": "object",
      "required": ["subtotal", "tax_total", "grand_total"],
      "properties": {
        "subtotal": { "type": "number" },
        "tax_total": { "type": "number" },
        "withholding_total": { "type": "number", "default": 0 },
        "grand_total": { "type": "number" }
      }
    },
    "audit_status": {
      "type": "object",
      "properties": {
        "kono_state": { "type": "string", "enum": ["GREEN", "YELLOW", "RED"] },
        "is_math_valid": { "type": "boolean" },
        "is_duplicate": { "type": "boolean" },
        "math_discrepancy_amount": { "type": "number" },
        "alerts": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
}
```

---

## 5. Matriz de Estados y Comportamiento de Kono (La Mascota)

| Estado | Color | Condición Disparadora | Comportamiento UX / Acción del Analista |
| :--- | :--- | :--- | :--- |
| **Aprobado Automático** | 🟢 **Verde** | - Validación matemática exacta ($|\Delta| \le 0.02$).<br>- Identificador fiscal válido.<br>- Sin duplicados ($	ext{Similitud} < 0.85$). | Moneda guiñando con pulgar arriba. Botón *"Aprobación Directa (1-Click)"*. Listo para exportación contable. |
| **Revisión Requerida** | 🟡 **Amarillo** | - Descuadre en sumatorias ($|\Delta| > 0.02$).<br>- Tasa de impuesto no identificada o fecha vencida.<br>- Confianza de lectura baja en algún campo. | Moneda con lupa y gesto de duda. Resalta en amarillo exactamente la fila o campo inconsistente para corrección manual inmediata. |
| **Alerta Crítica / Fraude** | 🔴 **Rojo** | - Duplicado semántico ($	ext{Similitud} \ge 0.95$).<br>- Mismo número de factura ya pagado.<br>- Discrepancia grave en emisor fiscal. | Moneda con brazos cruzados y placa de detective. Bloqueo preventivo de exportación hasta aprobación explícita de un supervisor. |

---

## 6. Alcance del Proyecto: MVP vs. Evolución Futura

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DELIMITACIÓN DEL MVP                          │
├──────────────────────────────────┬─────────────────────────────────────┤
│      INCLUIDO EN EL MVP          │        POSTERGADO PARA V2           │
├──────────────────────────────────┼─────────────────────────────────────┤
│ • Ingesta por Gmail vía n8n.     │ • Web scraping con Playwright en    │
│ • Triage de formato (Texto/Img). │   portales bancarios/servicios.     │
│ • Extracción estructurada JSON.  │ • 3-Way Matching contra Órdenes     │
│ • Validador aritmético en código.│   de Compra y Remisiones.           │
│ • Detección de duplicados con    │ • RAG de políticas internas de      │
│   embeddings semánticos.         │   aprobación de viáticos complejas. │
│ • Dashboard split-screen con     │ • Integración bidireccional API     │
│   estados de Kono (Verde/Am/Roj).│   directa a SAP, Oracle, NetSuite.  │
│ • Exportación CSV/JSON estándar. │ • Aprobaciones con flujos multi-rol │
│                                  │   y firmas digitales.               │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 7. Retorno de Inversión (ROI) y Propuesta de Valor para el Cliente

1. **Reducción de Tiempo Operativo:** Disminución del **85%** en horas/hombre dedicadas a captura y revisión manual de facturas.
2. **Eliminación de Errores de Cierre:** Cero descuadres contables a fin de mes causados por digitación equivocada de IVA o retenciones.
3. **Blindaje Financiero:** Detección en tiempo real de facturas duplicadas antes de programar la orden de pago bancaria.
4. **Facilidad de Adopción:** No requiere cambiar los canales de comunicación de los proveedores ni migrar sistemas contables existentes.

---

*Documento técnico-operativo de negocio elaborado para Kono.ai.*
