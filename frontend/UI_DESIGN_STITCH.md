# 🎨 Guía de Diseño Visual y Master Prompt para Stitch (Google Stitch / Figma / v0)

---

## 1. 🌈 Paleta de Colores & Estilo: "Dark Glassmorphism & Silver Titanium"

La interfaz combina **Dark Glassmorphism de alta gama** (vidrio esmerilado translúcido con desenfoque de fondo `backdrop-blur-xl`, reflejos sutiles de luz en los bordes `border-white/10` y sombras difusas) con la mascota **Kono** en **plata / platino metálico**.

| Elemento UI | Tokens CSS / Tailwind | Aspecto Visual |
| :--- | :--- | :--- |
| **Fondo Base del Canvas** | `#080B11` con gradiente radial sutil | Negro azulado profundo con malla de ruido sutil. |
| **Paneles Glassmorphism** | `bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl` | Paneles de cristal esmerilado flotantes con reflejo de luz perimetral. |
| **Cards & Inputs Glass** | `bg-white/[0.03] backdrop-blur-md border border-white/[0.08] focus:border-cyan-400/50` | Contenedores translúcidos con micro-interacciones suaves. |
| **🪙 Mascota Kono (Moneda)** | `#94A3B8` / `#E2E8F0` con textura metálica plateada | Moneda gris platino con acabado en cromo cepillado y aura reactiva. |
| **🟢 Estado Verde (Aprobado)** | `emerald-500/20` glow + `emerald-400` border & text | Resplandor esmeralda sobre cristal, checkmarks iluminados. |
| **🟡 Estado Amarillo (Alerta)** | `amber-500/20` glow + `amber-400` border & text | Resplandor ámbar cálido, lupa de Kono con reflejo de cristal. |
| **🔴 Estado Rojo (Duplicado)** | `rose-500/20` glow + `rose-400` border & text | Resplandor carmesí de alerta, placa de detective metálica. |

---

## 2. 🪄 Master Prompt con Glassmorphism para Stitch (Google Stitch / v0 / Claude UI)

```text
Create a high-fidelity, ultra-modern Glassmorphism UI for "Kono.ai" — an AI-powered financial invoice extractor, validator, and reconciliation platform.

### Aesthetics & Glassmorphism System
- Visual Theme: Premium Dark Glassmorphism (inspired by Apple VisionOS, Linear, and macOS Sonoma dark interface).
- Background: Deep obsidian canvas (#080B11) with subtle, smooth radial ambient glowing gradients (deep indigo #1E1B4B and cyan #083344) placed under translucent panels.
- Glass Surfaces: Every card, navbar, modal, and panel must feature authentic frosted glass styling:
  * Classes / CSS: `bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl`.
  * Inputs & Tables: `bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20`.
- Typography: Clean sans-serif for UI labels (Inter) and monospaced font for financial figures, tax IDs, and totals (JetBrains Mono).
- Core Brand Character: "Kono" — a charming, retro-futuristic animated SILVER/PLATINUM GREY metallic coin mascot (inspired by Miss Minutes from Loki, featuring a polished chrome/silver body #CBD5E1 / #94A3B8 with cartoon gloves and face). Kono reacts with an ambient frosted-glass aura for 3 states:
  1. Green State: Happy / Winking with thumbs up & emerald green neon halo (`shadow-[0_0_25px_rgba(16,185,129,0.3)]`).
  2. Yellow State: Puzzled / Holding a magnifying glass & warm amber halo (`shadow-[0_0_25px_rgba(245,158,11,0.3)]`).
  3. Red State: Detective / Folded arms with a badge & crimson red warning halo (`shadow-[0_0_25px_rgba(239,68,68,0.3)]`).

### Layout Architecture (Split-Screen Auditor Dashboard)

1. Floating Glass Top Navigation & Live Metrics Bar:
   - Floating frosted navbar (`bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-2xl px-6 py-3 mx-4 my-3`):
     * Left: Kono.ai logo with the animated Silver Coin mascot and glowing active pulse.
     * Center: Translucent pill KPI badges:
       - "⚡ 482 Invoices Processed Today" (`bg-white/5 border border-white/10`)
       - "💰 $0.00 Token Cost (95% Deterministic)"
       - "⏱️ 11.4 ms Avg Latency"
     * Right: Glass buttons for "📥 Dropzone Upload" and a glowing frosted primary button: "⚡ 1-Click Batch Approve (482 Ready)".

2. Main Workspace (50/50 Split-Screen Glass Containers):

   A. Left Panel: Frosted Glass PDF / Image Auditor Viewer (50% Width)
      - Encased in a large glass card (`bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4`).
      - Toolbar: Floating translucent pill with Page Selector, Zoom Slider, and "Bounding Box Overlay Toggle".
      - Document Canvas: Displays the original invoice with interactive, glowing SVG Bounding Boxes:
        * Blue Neon Stroke: Subtotal & Grand Total ($1,785.00).
        * Emerald Neon Stroke: VAT / Taxes (19% - $285.00).
        * Violet Neon Stroke: Invoice Number (INV-2026-8891) and Dates.
        * Amber Neon Stroke: Issuer Name & Tax ID.
      - Hover Effect: Glass tooltip appears with backdrop-blur displaying field extraction confidence ("Confidence: 99.8% - Deterministic").

   B. Right Panel: Structured Financial Audit Form & Items Table (50% Width)
      - Encased in a complementary frosted glass container.
      - Top Audit Status Card: Displays the Silver Kono Mascot with a translucent speech bubble:
        * Dialogue: "Everything checks out to the exact cent! Ready for 1-click ledger export."
        * Math Check Glass Pill: "Σ Items ($1,500.00) + Tax ($285.00) = $1,785.00 [Exact Match Δ = $0.00]".
      - Section 1: Issuer & Customer Metadata in compact glass input fields.
      - Section 2: Extracted Line Items Table with translucent rows and green verified tags.
      - Section 3: Totals & Tax Breakdown Glass Card with glowing large typography for the Grand Total ($1,785.00).
      - Bottom Floating Actions:
        * Glass button: "💾 Save Vendor Template".
        * Glowing Success Button: "✅ Approve & Export to ERP (1-Click)".

3. Interactive Micro-interactions & Responsiveness:
   - Bidirectional Focus: Clicking any form input illuminates the corresponding glowing SVG Bounding Box on the PDF canvas.
   - Fluid Tailwind CSS transitions with smooth glass reflections on hover.
```
