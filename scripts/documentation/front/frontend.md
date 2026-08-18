# Especificación Técnica de Arquitectura Frontend: Kono.ai

**Versión:** 1.0.0  
**Stack Principal:** React 18 / Vite, TypeScript, Tailwind CSS, Lucide Icons, PDF.js (`react-pdf`), TanStack Query (v5), Zustand (Estado global), Canvas / SVG Overlays.

---

## 1. Visión General de la Experiencia de Usuario (UX)

La interfaz de **Kono.ai** está diseñada como un **Centro de Comando Financiero y Auditoría por Excepción**. Su objetivo es que un analista contable pueda revisar cientos de facturas en minutos, interactuando únicamente con aquellas que presenten alertas o anomalías.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  KONO.AI | 🪙 Mascota Kono [🟢 482 Listas | 🟡 14 Revisar | 🔴 4 Duplicadas]        [⚡ Exportar] │
├────────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│                                │  FACTURA #INV-2026-8891  [🟢 100% Cuadrado]                     │
│   [VISOR PDF INTERACTIVO]      ├─────────────────────────────────────────────────────────────────┤
│                                │  🏢 EMISOR: Cloud Services SAS   NIT: 900.123.456-1             │
│   ┌────────────────────────┐   │  📅 FECHA: 15/08/2026            VENCE: 30/08/2026              │
│   │                        │   ├─────────────────────────────────────────────────────────────────┤
│   │ [Recuadro Azul: Total] │   │  📦 ÍTEMS DETECTADOS (3 líneas):                                │
│   │                        │   │  • Servidores Cloud (1 x $1,200.00) = $1,200.00                 │
│   │ [Recuadro Verde: IVA]  │   │  • Base de Datos (1 x $300.00)      = $300.00                   │
│   │                        │   ├─────────────────────────────────────────────────────────────────┤
│   │                        │   │  💵 TOTALES Y AUDITORÍA ARITMÉTICA:                             │
│   │                        │   │  • Subtotal:   $1,500.00  [✅ Cuadra con ítems]                 │
│   │                        │   │  • IVA (19%):    $285.00  [✅ Tasa verificada]                  │
│   │                        │   │  • Gran Total: $1,785.00  [✅ Exacto (Δ = $0.00)]               │
│   └────────────────────────┘   ├─────────────────────────────────────────────────────────────────┤
│    Zoom: [-] 100% [+] [⟳]      │  [💾 Guardar Plantilla]         [✅ APROBAR Y REGISTRAR (1-Click)]│
└────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 2. Componentes Principales

### 2.1 Visor Split-Screen con Bounding Boxes Interactivos (`PdfAuditorViewer.tsx`)
- **Visualizador:** Renderizado nativo con `react-pdf` o PDF.js sobre `<canvas>`.
- **Capa SVG de Resaltado (Bounding Box Overlay):** 
  - Al hacer hover o clic en un campo del formulario (ej. "Total a Pagar"), el visor resalta automáticamente el recuadro geométrico exacto en el PDF original.
  - Al hacer clic en un texto del PDF, el formulario enfoca automáticamente ese campo.

### 2.2 La Mascota Interactiva Kono (`KonoMascot.tsx`)
Inspirada en una moneda animada con expresividad estilo *Miss Minutes*, ofrece feedback emocional inmediato según el estado del documento:
- 🟢 **Verde (Feliz / Guiño):** Todo cuadrado al centavo. Cero duplicados.
- 🟡 **Amarillo (Alerta / Lupa):** Descuadre en decimales ($\Delta > 0.02$), impuesto no identificado o dato dudoso. Señala el campo en conflicto.
- 🔴 **Rojo (Detective / Brazos cruzados):** Alerta crítica de duplicado (mismo SHA-256 o mismo número/emisor ya registrado) o NIT inexistente.

### 2.3 Bandeja de Lotes y Métricas en Tiempo Real (`BatchDashboard.tsx`)
- **Métricas:** Facturas procesadas hoy, tasa de aprobación automática ($0 costo), tiempo promedio por documento (< 20 ms), tokens consumidos.
- **Filtros rápidos:** Ver solo excepciones (amarillas y rojas).
- **Acciones masivas:** Botón *"Aprobar todas las verdes"* (1-Click Batch Approval).

---

## 3. Estructura de Carpetas Frontend

```
frontend/
├── src/
│   ├── assets/                  # Animaciones SVG y sprites de la Mascota Kono
│   ├── components/
│   │   ├── audit/
│   │   │   ├── PdfViewer.tsx    # Visor PDF con overlay de Bounding Boxes
│   │   │   ├── BoundingBox.tsx  # Coordenadas interactivas SVG
│   │   │   ├── InvoiceForm.tsx  # Formulario editable de campos auditados
│   │   │   ├── ItemsTable.tsx   # Tabla de ítems con validación matemática en vivo
│   │   │   └── MathDiscrepancyBadge.tsx # Indicador visual de descuadres
│   │   ├── mascot/
│   │   │   ├── KonoMascot.tsx   # Moneda animada y sus 3 estados
│   │   │   └── MascotDialogue.tsx # Burbuja de diálogo con la explicación de la alerta
│   │   ├── dashboard/
│   │   │   ├── MetricsBar.tsx   # KPIs de velocidad, ahorro de costos y lotes
│   │   │   ├── DocumentList.tsx # Tabla reactiva con WebSockets
│   │   │   └── Dropzone.tsx     # Subida masiva Drag & Drop
│   │   └── common/              # Botones, Modales, Badges
│   ├── hooks/
│   │   ├── useDocumentWebSocket.ts # Conexión en vivo con el backend
│   │   ├── usePdfScale.ts       # Cálculo de escala de coordenadas PDF vs Pantalla
│   │   └── useInvoiceMutations.ts
│   ├── store/
│   │   └── auditStore.ts        # Estado Zustand: documento activo, bbox activo
│   ├── types/
│   │   └── invoice.ts           # Tipos TypeScript compartidos
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 4. Flujo de Interacción y Manejo de Estado

1. **Recepción en Tiempo Real:** El hook `useDocumentWebSocket` escucha eventos de Redis/FastAPI. Conforme los workers terminan de validar facturas, la lista de la UI se actualiza sin recargar la página.
2. **Transformación de Coordenadas:** 
   $$\text{ScreenX} = \text{PdfX} \times \text{ZoomFactor}, \quad \text{ScreenY} = \text{PdfY} \times \text{ZoomFactor}$$
   Esto garantiza que los recuadros de Bounding Box coincidan con absoluta precisión matemática sin importar el tamaño de pantalla del usuario.
3. **Guardado de Plantillas:** Al editar un campo manualmente, el usuario puede marcar la casilla *"Recordar posición para este proveedor"*, lo que envía un payload a `/api/v1/vendors/{id}/template` para auto-aprender la regla.
