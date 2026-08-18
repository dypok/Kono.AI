# US-FRONT-001 — Visor Split-Screen con Bounding Boxes Interactivos SVG (PDF & Imágenes)
**Tipo:** Story | **SP:** 8 | **Prioridad:** Alta (P0) | **Asignado:** Sayder
**Rama sugerida:** `feature/front-split-screen-pdf-bboxes`

---

## 📖 Historia de Usuario
> "Como analista contable de Kono.ai, quiero un visor interactivo en pantalla dividida que renderice el documento original a la izquierda con recuadros SVG (Bounding Boxes) sobre los datos extraídos y el formulario editable a la derecha, para auditar y contrastar visualmente el origen exacto de cada número en segundos."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] Renderizado fluido del archivo original (PDF de múltiples páginas o imágenes `.png`/`.jpg`) utilizando `react-pdf` o PDF.js sobre `<canvas>`.
- [ ] **Capa SVG de Bounding Boxes Interactivos:**
  - Dibuja recuadros semánticos sobre el documento según las coordenadas `[x0, y0, x1, y1]` recibidas del backend.
  - Colores de recuadros: Azul para Totales/Subtotales, Verde para Impuestos, Violeta para Fechas, Naranja para Datos del Emisor.
- [ ] **Interactividad y Sincronización Bidireccional:**
  - **Formulario $\to$ Visor:** Al hacer hover o focus en un campo del formulario (ej. Subtotal), el visor ilumina el recuadro correspondiente en el PDF y realiza un auto-scroll suave hacia él si está fuera de pantalla.
  - **Visor $\to$ Formulario:** Al hacer clic sobre cualquier recuadro en el PDF, enfoca automáticamente el input correspondiente en el formulario para edición inmediata.
- [ ] **Controles de Visualización:**
  - Zoom interactivo (`Zoom In`, `Zoom Out`, `Ajustar a Ancho`, `Ajustar a Página`).
  - Recálculo matemático de coordenadas SVG al hacer zoom:
    $$\text{ScreenX} = \text{PdfX} \times \text{ZoomFactor}, \quad \text{ScreenY} = \text{PdfY} \times \text{ZoomFactor}$$
- [ ] Panel derecho con tabla de ítems editable en tiempo real (Cantidad, Precio Unitario, Total de Línea).

---

## 📋 Subtasks Desglosadas por Capa

### ⚛️ [FRONT-SETUP] Inicialización & Dependencias
- [ ] Inicializar proyecto en `frontend/` con Vite + React 18 + TypeScript + Tailwind CSS.
- [ ] Instalar dependencias clave: `react-pdf`, `pdfjs-dist`, `lucide-react`, `@tanstack/react-query`, `zustand`, `clsx`, `tailwind-merge`.
- [ ] Configurar tipografía corporativa y variables de color en `tailwind.config.js`.

### 📄 [FRONT-VIEWER] Visor PDF & Capa SVG
- [ ] Implementar `src/components/audit/PdfViewer.tsx` con soporte para multi-página y cambio de página.
- [ ] Implementar `src/components/audit/BoundingBoxOverlay.tsx` creando una capa `<svg>` superpuesta con `pointer-events-none` y elementos `<rect>` interactivos.
- [ ] Implementar hook personalizado `usePdfScale.ts` para calcular la relación de aspecto del viewport y recalcular coordenadas tras redimensionar ventana.

### 📝 [FRONT-FORM] Formulario de Auditoría & Tabla de Ítems
- [ ] Implementar `src/components/audit/InvoiceForm.tsx` con campos para Emisor, NIT, Factura N°, Fechas y Totales.
- [ ] Implementar `src/components/audit/ItemsTable.tsx` permitiendo editar cantidades y precios con recálculo visual en tiempo real.
- [ ] Crear store global con Zustand en `src/store/auditStore.ts` para sincronizar el `activeField` y `activeBBoxId`.

### 🧪 [TESTS & UI REVIEW]
- [ ] Crear tests de componentes con Vitest y React Testing Library para `BoundingBoxOverlay.tsx`.
- [ ] Probar interactividad con un PDF real de 3 páginas y verificar que el auto-scroll ubique el recuadro correcto en la página 2 y 3.
