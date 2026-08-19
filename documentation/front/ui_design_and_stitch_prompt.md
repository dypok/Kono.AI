# 🎨 Guía de Diseño Visual y Master Prompt para Stitch (Google Stitch / Figma / v0)

---

## 1. 🌈 Paleta de Colores Oficial: "Silver Titanium & Warm Alabaster Glass"

La interfaz utiliza una estética minimalista y refinada de ingeniería financiera basada en **Gris Plateado / Titanio (`#0F141C` a `#94A3B8`)** con superficies en **Blanco Crema / Alabastro Translúcido (`#FDFBF7` / `rgba(254, 252, 248, 0.06)`)**, vidrio esmerilado (`backdrop-blur-xl`), bordes de platino fino y la mascota **Kono** en **moneda gris/plateada**.

---

### 🎨 Tabla de Tokens de Color y Superficies

| Elemento UI | Tokens CSS / Tailwind | Aspecto Visual |
| :--- | :--- | :--- |
| **Fondo Base del Canvas** | `#0D1117` con sutil tinte platino | Gris titanio oscuro / antracita mate elegante. |
| **Paneles Glassmorphism (Crema/Plata)** | `bg-[#FAF8F5]/[0.05] backdrop-blur-2xl border border-white/15 shadow-2xl` | Cristal esmerilado con sutil calidez blanco crema y reflejos platino. |
| **Cards & Inputs Glass** | `bg-white/[0.04] backdrop-blur-md border border-[#E2D9CE]/20 text-[#FAF8F5] focus:border-[#E2D9CE]/60` | Superficies translúcidas en crema suave con contraste nítido. |
| **Tipografía Principal (Alabastro/Crema)** | `#FAF8F5` (`text-stone-50`) | Títulos, importes y etiquetas en blanco crema cálido legible. |
| **Tipografía Secundaria (Platino)** | `#94A3B8` / `#A1A1AA` (`text-zinc-400`) | Placeholders, metadatos, números auxiliares. |
| **🪙 Mascota Kono (Moneda)** | `#CBD5E1` / `#94A3B8` (Plata pulida / Cromo) | Moneda gris metálica con guantes y rostro expresivo de caricatura. |
| **🟢 Estado Verde (Aprobado)** | `#10B981` (`emerald-400`) | Resplandor esmeralda suave, checkmarks matemáticos. |
| **🟡 Estado Amarillo (Alerta)** | `#FBBF24` (`amber-400`) | Resplandor ámbar cálido, lupa de Kono. |
| **🔴 Estado Rojo (Duplicado)** | `#F43F5E` (`rose-400`) | Resplandor carmesí de advertencia, badge de detective. |

---

## 2. 🪄 Master Prompt Actualizado para Stitch (Google Stitch / v0 / Claude UI)

Copia y pega el siguiente prompt en **Stitch**:

```text
Create a high-fidelity, ultra-modern Glassmorphism UI for "Kono.ai" — an AI-powered financial invoice extractor, validator, and reconciliation platform.

### Aesthetics & Color Palette System ("Silver Titanium & Warm Alabaster Glass")
- Visual Style: Minimalist luxury financial engineering interface (inspired by Braun Dieter Rams design, Linear dark silver mode, and Apple VisionOS glass).
- Color Theme:
  * Base Canvas: Deep Matte Titanium Grey (#0D1117).
  * Frosted Glass Panels: Translucent warm alabaster / cream glass tint (`bg-[#FAF8F5]/[0.05] backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl`).
  * Form Inputs & Datagrids: Crisp cream-bordered glass containers (`bg-white/[0.03] backdrop-blur-md border border-[#E2D9CE]/20 rounded-xl focus:border-[#E2D9CE]/60`).
  * Typography: Crisp warm white/cream (#FAF8F5) for primary headings and balances; cool platinum grey (#94A3B8) for secondary labels. Financial figures rendered in monospace font (JetBrains Mono).
- Core Brand Mascot: "Kono" — a charming, retro-futuristic animated SILVER/PLATINUM GREY metallic coin mascot (inspired by Miss Minutes from Loki, featuring a polished chrome/silver body #CBD5E1 / #94A3B8 with cartoon gloves and expressive eyes). Kono reacts with an ambient frosted-glass aura for 3 states:
  1. Green State: Happy / Winking with thumbs up & soft emerald glow (`shadow-[0_0_20px_rgba(16,185,129,0.25)]`).
  2. Yellow State: Puzzled / Holding a magnifying glass & warm amber glow (`shadow-[0_0_20px_rgba(245,158,11,0.25)]`).
  3. Red State: Detective / Folded arms with a badge & crimson red alert glow (`shadow-[0_0_20px_rgba(244,63,94,0.25)]`).

### Layout Architecture (Split-Screen Auditor Dashboard)

1. Floating Glass Top Navigation & Live KPI Bar:
   - Floating frosted cream/silver navbar (`bg-stone-900/60 backdrop-blur-2xl border border-white/15 rounded-2xl px-6 py-3 mx-4 my-3`):
     * Left: Kono.ai wordmark with the animated Silver Coin mascot and live system status dot.
     * Center: Translucent pill KPI badges:
       - "⚡ 482 Invoices Processed Today" (`bg-white/5 border border-white/10 text-stone-200`)
       - "💰 $0.00 Token Cost (95% Deterministic)"
       - "⏱️ 11.4 ms Avg Latency"
     * Right: Warm alabaster glass action buttons: "📥 Dropzone Upload" and a glowing primary cream button: "⚡ 1-Click Batch Approve (482 Ready)".

2. Main Workspace (50/50 Split-Screen Glass Containers):

   A. Left Panel: Frosted Glass PDF / Image Document Viewer (50% Width)
      - Encased in a frosted glass card (`bg-stone-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4`).
      - Toolbar: Translucent pill with Page Selector, Smooth Zoom Controls, and "Bounding Box Overlay Toggle".
      - Document Canvas: Displays the original invoice with interactive SVG Bounding Boxes:
        * Silver/Cyan Stroke: Subtotal & Grand Total ($1,785.00).
        * Emerald Stroke: VAT / Taxes (19% - $285.00).
        * Cream/Platinum Stroke: Invoice Number (INV-2026-8891) and Dates.
        * Amber Stroke: Issuer Name & Tax ID.
      - Hover Effect: Glass tooltip appears with backdrop-blur displaying field extraction confidence ("Confidence: 99.8% - Deterministic").

   B. Right Panel: Structured Financial Audit Form & Items Table (50% Width)
      - Encased in a complementary frosted cream-glass container.
      - Top Audit Status Card: Displays the Silver Kono Mascot with a translucent speech bubble:
        * Dialogue: "Everything checks out to the exact cent! Ready for 1-click ledger export."
        * Math Check Glass Pill: "Σ Items ($1,500.00) + Tax ($285.00) = $1,785.00 [Exact Match Δ = $0.00]".
      - Section 1: Issuer & Customer Metadata in compact glass input fields.
      - Section 2: Extracted Line Items Table with translucent rows and green verified checkmarks.
      - Section 3: Totals & Tax Breakdown Glass Card with large warm white typography for the Grand Total ($1,785.00).
      - Bottom Floating Actions:
        * Secondary Glass Button: "💾 Save Vendor Template".
        * Glowing Success Button: "✅ Approve & Export to ERP (1-Click)".

3. Micro-interactions & Responsiveness:
   - Bidirectional Highlighting: Focusing or clicking any input on the right form smoothly scrolls and illuminates the corresponding SVG Bounding Box on the left PDF canvas.
   - Smooth glass reflections on hover and fluid transitions.
```
