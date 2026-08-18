# US-FRONT-003 — Editor Interactivo de Plantillas de Proveedor (Point & Click Template Builder)
**Tipo:** Story | **SP:** 5 | **Prioridad:** Media (P1) | **Asignado:** Sayder
**Rama sugerida:** `feature/front-vendor-template-builder`

---

## 📖 Historia de Usuario
> "Como analista contable, quiero una herramienta visual en la interfaz donde pueda dibujar o ajustar con el cursor los recuadros de Bounding Boxes sobre un PDF de un proveedor nuevo y asignarle etiquetas (ej. 'Total', 'Subtotal', 'Factura N°'), para crear y calibrar plantillas de extracción automática en menos de 1 minuto sin escribir código."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] Modo "Diseñador de Plantilla" sobre el visor PDF: permite arrastrar el ratón para dibujar un nuevo recuadro sobre cualquier zona del documento.
- [ ] Menú flotante al terminar de dibujar el recuadro para asignarle el campo correspondiente (`Factura N°`, `Fecha Emisión`, `Subtotal`, `IVA`, `Total`, `Nombre Emisor`, `NIT Emisor`).
- [ ] Vista previa instantánea del texto extraído de las coordenadas seleccionadas.
- [ ] Botón *"Guardar Plantilla para [Emisor]"* que envía la definición JSON a `POST /api/v1/vendors/{tax_id}/template`.
- [ ] Lista de plantillas activas en la configuración de la app con opción de editar o eliminar.

---

## 📋 Subtasks Desglosadas por Capa

### 🎨 [FRONT-CANVAS] Herramienta de Selección Rectangular (Drag to Draw)
- [ ] Implementar `src/components/audit/TemplateDrawingCanvas.tsx` escuchando eventos `onMouseDown`, `onMouseMove`, `onMouseUp` sobre el lienzo del PDF.
- [ ] Calcular coordenadas relativas porcentuales para que la plantilla sea agnóstica de la resolución de pantalla.

### 🏷️ [FRONT-TAGGER] Menú Flotante de Asignación de Campos
- [ ] Implementar componente `src/components/audit/FieldTagMenu.tsx` con selector de campo y dropdown de opciones.
- [ ] Al seleccionar campo, mostrar badge con color temático (ej. Azul = Totales, Violeta = Fechas) y actualizar el formulario en vivo.

### 💾 [FRONT-MUTATIONS] Guardado de Plantillas en Backend
- [ ] Integrar mutación con TanStack Query en `src/hooks/useVendorTemplates.ts` llamando a la API de FastAPI.
- [ ] Toast de confirmación: *"✅ Plantilla para [Proveedor] guardada con éxito. Las próximas facturas se procesarán automáticamente."*

### 🧪 [TESTS & UI REVIEW]
- [ ] Crear test de componentes verificando el dibujo del rectángulo y la emisión de coordenadas.
- [ ] Probar calibración con una factura real verificando que las coordenadas guardadas coincidan con el backend.
