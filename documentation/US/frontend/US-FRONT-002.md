# US-FRONT-002 — Mascota Interactiva Kono, Dashboard de Lotes & Aprobación 1-Click
**Tipo:** Story | **SP:** 8 | **Prioridad:** Alta (P0) | **Asignado:** Sayder
**Rama sugerida:** `feature/front-kono-mascot-batch-dashboard`

---

## 📖 Historia de Usuario
> "Como analista contable de Kono.ai, quiero que la Mascota Kono interactiva (inspirada en Miss Minutes) me muestre el estado de auditoría con expresiones visuales (🟢 Verde, 🟡 Amarillo, 🔴 Rojo), un dashboard en tiempo real de facturas procesadas y un botón de Aprobación en 1-Click, para gestionar cientos de comprobantes sin fatiga y resolviendo únicamente excepciones."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] **Componente Mascota Interactiva Kono (`KonoMascot.tsx`):**
  - 🟢 **Verde (Feliz / Guiño):** Se activa si la matemática cuadra al 100% ($\Delta \le 0.02$). Muestra mensaje *"¡Factura íntegra! Lista para exportación contable"*.
  - 🟡 **Amarillo (Alerta / Lupa):** Se activa si hay descuadre de centavos o campos dudosos. Señala el campo en conflicto: *"Atención: Hay un descuadre de $X en el Subtotal"*.
  - 🔴 **Rojo (Detective / Brazos cruzados):** Se activa si el documento es un duplicado o el emisor no es válido. Bloquea el botón de exportación preventiva.
- [ ] **Dashboard de Lotes en Tiempo Real (`BatchDashboard.tsx`):**
  - Conexión vía WebSocket (`useDocumentWebSocket.ts`) para recibir documentos procesados en vivo sin recargar la página.
  - Barra superior de KPIs:
    - Total de comprobantes procesados hoy.
    - % de Aprobados en Automático (Zero-Token / $0 costo).
    - Tiempo promedio por comprobante ($< 20\text{ ms}$).
  - Zona Drag & Drop con `react-dropzone` para soltar hasta 100 archivos PDF de golpe.
- [ ] **Acciones de Auditoría Rápida:**
  - Botón *"Aprobación Directa (1-Click)"* para documentos en verde (actualiza estado a `APPROVED` y exporta).
  - Botón *"Recordar esta plantilla para [Emisor]"* que persiste las coordenadas editadas para procesar automáticamente futuras facturas de ese proveedor.

---

## 📋 Subtasks Desglosadas por Capa

### 🪙 [FRONT-MASCOT] Animaciones SVG & Estados de Kono
- [ ] Crear componentes vectoriales SVG de la Mascota Kono en `src/components/mascot/KonoMascot.tsx`.
- [ ] Implementar micro-animaciones con Tailwind CSS / Framer Motion (parpadeo de ojos, movimiento de lupa y brazos).
- [ ] Implementar `src/components/mascot/MascotDialogue.tsx` renderizando bocadillos de texto contextuales con las alertas del validador.

### 📊 [FRONT-DASHBOARD] KPIs, Dropzone & Lista Reactiva
- [ ] Implementar `src/components/dashboard/MetricsBar.tsx` mostrando contadores animados de documentos y ahorro de costos.
- [ ] Implementar `src/components/dashboard/Dropzone.tsx` con indicador de progreso de subida múltiple.
- [ ] Implementar `src/components/dashboard/DocumentList.tsx` con selector de estado (Pills: Todas, 🟢 Verdes, 🟡 Amarillas, 🔴 Rojas).

### ⚡ [FRONT-WS] Conexión WebSocket & Mutaciones TanStack Query
- [ ] Implementar hook `src/hooks/useDocumentWebSocket.ts` para conectar con `WS /api/v1/ws/audit-feed` con reconexión automática tras caída de red.
- [ ] Implementar mutaciones en `src/hooks/useInvoiceMutations.ts` para Aprobación 1-Click y Guardado de Plantillas con invalidación de caché reactiva.

### 🧪 [TESTS & VERIFICACIÓN]
- [ ] Crear test de integración con MSW (Mock Service Worker) simulando la llegada de 20 eventos WebSocket y verificando la reactividad de la tabla.
- [ ] Probar el flujo completo: Drag & drop de 3 archivos $\to$ visualización del estado de Kono $\to$ aprobación 1-click.
