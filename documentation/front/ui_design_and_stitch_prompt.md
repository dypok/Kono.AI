# 🎨 Guía de Diseño Visual y Master Prompt para Stitch (Google Stitch / Figma / v0)

---

## 1. 🌈 3 Propuestas de Paletas de Colores Recomendadas

Para una plataforma financiera y de auditoría contable con la mascota **Kono** (Miss Minutes style), la interfaz debe transmitir **rigor técnico, claridad visual sin fatiga y contraste de alta precisión** para los Bounding Boxes y estados semánticos (🟢/🟡/🔴).

---

### 🟢 Opción 1: "Fintech Dark Mode & Emerald Gold" (Recomendada)
*Transmite modernidad, alta tecnología y solidez financiera (estilo Linear / Supabase / Stripe).*

| Elemento UI | Hex / Tailwind | Uso en la Aplicación |
| :--- | :--- | :--- |
| **Fondo Principal** | `#0B0F17` (`bg-slate-950`) | Canvas general y fondo del visor PDF. |
| **Superficie / Cards** | `#161F2E` (`bg-slate-900/80`) | Paneles laterales, barra de métricas, formulario. |
| **Bordes & Separadores** | `#26354A` (`border-slate-800`) | Bordes sutiles de inputs y tablas. |
| **Texto Primario** | `#F8FAFC` (`text-slate-50`) | Títulos, importes totales, números en JetBrains Mono. |
| **Texto Secundario** | `#94A3B8` (`text-slate-400`) | Etiquetas, fechas, placeholders. |
| **Acento Primario (Kono Gold)** | `#F59E0B` (`amber-500`) | Detalles de marca, la moneda Kono, botones primarios. |
| **🟢 Estado Verde (Aprobado)** | `#10B981` (`emerald-500`) | Totales exactos, bounding boxes verificados, Kono feliz. |
| **🟡 Estado Amarillo (Alerta)** | `#FBBF24` (`amber-400`) | Descuadres de centavos, bounding boxes en duda, Kono lupa. |
| **🔴 Estado Rojo (Duplicado)** | `#EF4444` (`red-500`) | Facturas duplicadas, NIT inválido, Kono detective. |

---

### 🔵 Opción 2: "Modern Clean Light / Obsidian Slate" (Modo Claro de Alto Rendimiento)
*Ideal para oficinas contables tradicionales que trabajan en monitores de alta luminosidad.*

| Elemento UI | Hex / Tailwind | Uso en la Aplicación |
| :--- | :--- | :--- |
| **Fondo Principal** | `#F8FAFC` (`bg-slate-50`) | Fondo limpio y espacioso. |
| **Superficie / Cards** | `#FFFFFF` (`bg-white`) | Tarjetas con elevación sutil (`shadow-sm`). |
| **Bordes & Separadores** | `#E2E8F0` (`border-slate-200`) | División clara entre visor y formulario. |
| **Texto Primario** | `#0F172A` (`text-slate-900`) | Tipografía oscura de máxima legibilidad. |
| **Acento Kono** | `#4F46E5` (`indigo-600`) + `#F59E0B` | Contraste premium índigo/oro. |
| **Estados Semánticos** | `Emerald-600` (Verde), `Amber-500` (Amarillo), `Rose-600` (Rojo). |

---

### 🟣 Opción 3: "Cyberpunk Executive / Deep Indigo Neon"
*Una estética atrevida e inspirada en Loki / TVA (estilo Miss Minutes retro-futurista).*

| Elemento UI | Hex / Tailwind | Uso en la Aplicación |
| :--- | :--- | :--- |
| **Fondo Principal** | `#0D0B14` | Negro con sutil tinte púrpura profundo. |
| **Superficie / Cards** | `#171326` | Tarjetas con resplandor neón sutil. |
| **Mascota Kono (TVA Orange)** | `#FF6B00` | Naranja vibrante de Miss Minutes. |
| **Bounding Boxes** | Cian `#06B6D4`, Lima `#84CC16`, Magenta `#EC4899`. | Resaltado hiper-visible sobre facturas escaneadas. |

---

## 2. 🪄 Master Prompt Detallado para Stitch (Google Stitch / v0 / Claude UI)

Copia y pega el siguiente prompt en **Stitch** para generar el diseño completo de la interfaz:

```text
Create a high-fidelity, production-ready UI for "Kono.ai" — an AI-powered financial invoice extractor, validator, and reconciliation platform.

### Theme & Aesthetics
- Design Style: Modern dark mode financial engineering tool (inspired by Linear, Stripe, and Supabase) with deep slate backgrounds (#0B0F17), subtle translucent glassmorphism cards (#161F2E), and crisp border separators (#26354A).
- Typography: Clean sans-serif for UI labels (Inter) and monospaced font for financial figures, tax IDs, and totals (JetBrains Mono).
- Core Brand Character: "Kono" — a charming, retro-futuristic animated golden coin mascot (inspired by Miss Minutes from Loki). Kono reacts dynamically with 3 distinct emotional states:
  1. Green (Happy / Winking with thumbs up): When the invoice math matches 100% (Δ = $0.00).
  2. Yellow (Puzzled / Holding a magnifying glass): When there's a penny discrepancy, tax mismatch, or unverified field.
  3. Red (Detective / Folded arms with a badge): For duplicate invoices or critical tax fraud alerts.

### Layout Architecture (Split-Screen Auditor Dashboard)

1. Top Navigation & KPI Banner:
   - Left: Kono.ai logo with the animated Golden Coin mascot, workspace switcher ("Corporate Finance"), and active batch indicator.
   - Center: Live KPI stat badges:
     * "⚡ 482 Invoices Processed Today"
     * "💰 $0.00 Token Cost (95% Deterministic)"
     * "⏱️ 11.4 ms Avg Latency"
   - Right: Action bar with "📥 Drag & Drop Upload Zone" button, "⚙️ Vendor Templates" manager, and a prominent primary amber button: "⚡ 1-Click Batch Approve (482 Ready)".

2. Main Workspace (50/50 Split-Screen Interactive Canvas):

   A. Left Panel: Interactive PDF / Image Auditor Viewer (50% Width)
      - Header toolbar with: Page Selector (Page 1 of 2), Zoom Controls (Zoom in, Zoom out, Fit to Width), Rotation, and "Bounding Box Overlay Toggle".
      - Main Viewer Canvas: Renders the PDF invoice document with interactive SVG Bounding Boxes overlaying extracted fields:
        * Blue Rectangles: Subtotal, Grand Total ($1,785.00).
        * Green Rectangles: VAT / Taxes (19% - $285.00).
        * Purple Rectangles: Invoice Number (INV-2026-8891) and Issue Date (15/08/2026).
        * Orange Rectangles: Issuer Name (Cloud Hosting SAS) and Tax ID (900.123.456-1).
      - Hover Effect: Hovering any bounding box highlights it with a glowing stroke and triggers a tooltip displaying confidence score ("Confidence: 99.8% - Deterministic").

   B. Right Panel: Structured Financial Audit Form & Items Table (50% Width)
      - Top Audit Status Card: Displays the dynamic Kono Mascot with an interactive dialogue bubble:
        * Example Green State: "Everything checks out to the exact cent! Ready for 1-click ledger export."
        * Shows Math Verification Badge: "Σ Items ($1,500.00) + Tax ($285.00) = $1,785.00 [Exact Match Δ = $0.00]".
      - Section 1: Issuer & Customer Metadata (2-column compact inputs for Vendor Name, Tax ID/NIT, Invoice Folio, Issue Date, Due Date, Currency USD/COP).
      - Section 2: Extracted Line Items Table (Interactive datagrid with Description, Quantity, Unit Price, Line Total, and inline mathematical checkmarks).
      - Section 3: Totals & Tax Breakdown Card:
        * Subtotal: $1,500.00
        * VAT (19%): $285.00
        * Grand Total: $1,785.00 (Rendered in large bold typography)
      - Bottom Floating Footer Actions:
        * Secondary Button: "💾 Save Position as Vendor Template" (with a checkbox "Auto-apply for this vendor").
        * Danger Button (if red): "⛔ Reject & Flag Duplicate".
        * Primary Success Button: "✅ Approve & Export to ERP (1-Click)".

3. Interactive Micro-interactions & Responsiveness:
   - Bidirectional Highlighting: Focusing or clicking any input on the right form smoothly scrolls and illuminates the corresponding SVG Bounding Box on the left PDF canvas.
   - Smooth badge animations and clean Tailwind CSS transitions.
```
