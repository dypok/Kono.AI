# 🪙 Kono.ai — Extractor, Validador y Reconciliador Inteligente de Facturas

> *"Cero digitación, cero descuadres: Kono procesa, audita y concilia tus facturas antes de que toquen tus libros contables."*

---

## 🚀 Visión General
**Kono.ai** es una plataforma de automatización de cuentas por pagar (AP Automation) y reconciliación contable diseñada para procesar cientos de facturas PDF e imágenes con latencia ultra-baja ($< 15\text{ ms}$), costo prácticamente nulo ($0 tokens en el 95% de los casos) y auditoría visual por excepción mediante la **Mascota Kono** (🟢 Verde, 🟡 Amarillo, 🔴 Rojo).

---

## 🏗️ Arquitectura del Sistema

El proyecto utiliza una arquitectura **Dual-Backend** de alto rendimiento:

1. **🦀 Core de Ingesta & Pre-procesamiento (Rust):**
   - Folder Watcher de ultra-bajo consumo de memoria con `notify` y `tokio`.
   - Hashing `SHA-256` instantáneo para deduplicación flash.
   - Fast PDF Triage y extracción de primitivas de texto/Bounding Boxes (`lopdf` / `pdfium`).
   - Pre-procesamiento de escaneos (Deskewing, Denoise, Binarización Otsu con OpenCV).
   - Publicación asíncrona hacia la cola de **Redis Stream**.

2. **🐍 Motor de Negocio, Auditoría & API (Python FastAPI):**
   - Consumidor Worker asíncrono de Redis.
   - Parser Espacial Heurístico (Ray-Casting de Anclas y Tablas).
   - Validador Aritmético Determinista ($\sum \text{items} = \text{Subtotal} \pm 0.02$).
   - Auto-aprendizaje de plantillas de proveedor (`vendor_templates`).
   - Fallback selectivo a OpenAI (`gpt-4o-mini`) solo para casos con confianza $< 70\%$.
   - FastAPI REST API y canal WebSockets para feed en tiempo real.

3. **⚛️ Frontend de Auditoría Split-Screen (React + Tailwind CSS):**
   - Visor PDF interactivo con capa SVG de Bounding Boxes sincronizada bidireccionalmente.
   - Mascota Kono interactiva (inspirada en *Miss Minutes*) con animaciones de estado.
   - Dashboard de lotes, KPIs de velocidad y botón de Aprobación en 1-Click.

---

## 📚 Índice de Documentación Técnica

Toda la documentación técnica del proyecto se encuentra estructurada y lista para consulta:

- **Especificación de Negocio:** [documentation/business-doc.md](documentation/business-doc.md)
- **Arquitectura Backend:** [documentation/back/backend.md](documentation/back/backend.md)
- **Arquitectura Frontend:** [documentation/front/frontend.md](documentation/front/frontend.md)
- **Modelo de Base de Datos:** [documentation/db/db_v0.md](documentation/db/db_v0.md)
- **Backlog & Historias de Usuario Jira-Ready:** [documentation/US/BACKLOG_SUMMARY.md](documentation/US/BACKLOG_SUMMARY.md)
  - 🦀 [Historias Backend Rust (Dylan & Daniel)](documentation/US/backend-rust/)
  - 🐍 [Historias Backend Python (Dylan & Daniel)](documentation/US/backend-python/)
  - ⚛️ [Historias Frontend React (Sayder)](documentation/US/frontend/)
- **Guía de Instalación Universal de Skill & Reglas:** [INSTALL_SKILL.md](INSTALL_SKILL.md)
- **Changelog Diario:** [documentation/changelog/](documentation/changelog/)

---

## 🛠️ Herramientas de Prueba y Testing

- **Generador de Facturas Sintéticas:** `scripts/invoices.py`
  ```bash
  python scripts/invoices.py --output-dir ./test_invoices
  ```
  Genera automáticamente PDFs con casos:
  - 🟢 `factura_valida_green.pdf` (Matemática perfecta)
  - 🟡 `factura_descuadre_yellow.pdf` (Error aritmético de centavos)
  - 🔴 `factura_duplicada_red.pdf` (Duplicado)

---

## 👥 Equipo y Asignación de Roles

| Integrante | Rol Principal | Áreas de Responsabilidad |
| :--- | :--- | :--- |
| **Sayder** | Frontend Lead & UX/UI | React 18, Tailwind, Visor Split-Screen SVG, Mascota Kono, WebSockets UI |
| **Dylan** | Backend Engineer (Rust & Python) | Folder Watcher Rust, Hashing SHA-256, Motor Espacial Ray-Casting Python, CRUD FastAPI |
| **Daniel** | Backend Engineer (Rust & Python) | PDF Triage Rust, Pre-proc Imagen/OCR, Validador Aritmético Python, Fallback OpenAI, Docker |
