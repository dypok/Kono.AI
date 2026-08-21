# 🪙 Kono.ai — Extractor, Validador y Reconciliador Inteligente de Facturas

> *"Cero digitación, cero descuadres: Kono procesa, audita y concilia tus facturas antes de que toquen tus libros contables."*

---

## 👥 Integrantes del Proyecto

| Nombre Completo | Rol Principal | Áreas de Responsabilidad |
| :--- | :--- | :--- |
| **Dylan Gamero** | **Backend Core & Pipeline Lead** | Ingesta Rust Core, Hashing SHA-256, Motor Espacial Ray-Casting Python, CRUD FastAPI, Ingesta Webhook REST |
| **Daniel Echeverría** | **Backend AI & Systems Lead** | PDF Triage & Clasificador Rust, Pre-proc Imagen/OCR, Validador Aritmético, Integración Gmail OAuth2/IMAP, Docker |
| **Sayder Carreño** | **Frontend & UX/UI Lead** | React 18, Tailwind CSS, Liquid Glass UI, Visor Split-Screen SVG, Mascota Kono (Miss Minutes), WebSockets UI |

- 🔗 **Repositorio Oficial:** [https://github.com/dypok/Kono.IA.git](https://github.com/dypok/Kono.IA.git)

---

## 🚀 Visión General
**Kono.ai** es una plataforma de automatización de cuentas por pagar (AP Automation) y reconciliación contable diseñada para procesar cientos de facturas PDF e imágenes con latencia ultra-baja ($< 15\text{ ms}$), costo prácticamente nulo ($0 tokens en el 95% de los casos) y auditoría visual por excepción mediante la **Mascota Kono** (🟢 Verde, 🟡 Amarillo, 🔴 Rojo).

### 🌟 Capacidades Clave
1. **🦀 Triage y Clasificación Instantánea en Rust Core:** Identificación y descarte de documentos no contables en microsegundos consumiendo la base de conocimiento JSON sin recompilar.
2. **🧭 Motor Espacial Determinista (Ray-Casting):** Extracción precisa de folios, fechas, emisor, ítems y totales con soporte bilingüe (Español / Inglés).
3. **💵 Detección USD y Conversión Automática a COP:** Consulta diaria de la tasa oficial TRM con caché de 24h para contabilidad colombiana.
4. **📧 Ingesta de Correo Nativa (Multi-Bandeja):** Sincronización continua de bandejas de correo mediante Gmail API OAuth 2.0 e IMAP SSL con etiquetado jerárquico (`KONO_INVOICE/{Empresa}/{Debito|Credito}`).
5. **👁️ Visor Split-Screen SVG & Mascota Kono:** Auditoría interactiva con Bounding Boxes sincronizados y aprobación en 1-Click.

---

## 💻 Guía de Instalación y Ejecución Rápida (Docker All-in-One)

Todo el clúster (Redis + Rust Core + Python FastAPI + React/Nginx con Liquid Glass UI) está empaquetado y orquestado en un **único contenedor de alta eficiencia en el puerto 80**.

### 📋 Prerrequisitos
- **Docker** y **Docker Compose** instalados (Linux, macOS o Windows con WSL2).
- **Git** instalado.

---

### ⚡ Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/dypok/Kono.IA.git
cd Kono.IA
```

---

### ⚙️ Paso 2: Configurar Variables de Entorno (Opcional)
Copia la plantilla de configuración `.env.example` a `.env`:
```bash
cp .env.example .env
```
*(Opcional: Si deseas habilitar el fallback con OpenAI / Gemini para facturas complejas, ingresa tu `OPENAI_API_KEY` en el archivo `.env`).*

---

### 🐳 Paso 3: Levantar el Entorno con Docker Compose
Ejecuta el siguiente comando para compilar e iniciar el contenedor:
```bash
docker compose up -d --build
```

---

### 🌐 Paso 4: Acceder a los Servicios

Una vez levantado el stack, todos los servicios están integrados en **el puerto 80**:

| Servicio | URL Local | Descripción |
| :--- | :--- | :--- |
| **⚛️ Aplicación Web Completa (Liquid Glass UI)** | [http://localhost](http://localhost) | Dashboard de auditoría, Login Mock, Mascota Kono y visor de facturas. |
| **🐍 Backend API (FastAPI / Swagger)** | [http://localhost/api/v1/ping](http://localhost/api/v1/ping) | Endpoints de ingesta, auditoría determinista, exportación y triage. |
| **⚡ WebSocket Feed en Vivo** | `ws://localhost/api/v1/ws/audit-feed` | Canal WebSocket en tiempo real para transmisión de eventos. |

---

### 🧪 Paso 5: Generar Facturas de Prueba Sintéticas
Para generar comprobantes de prueba en PDF (🟢 Válidos, 🟡 Descuadres y 🔴 Duplicados):
```bash
python scripts/seed_invoices.py
```

---

## 🏗️ Arquitectura del Sistema (Dual-Backend)

1. **🦀 Core de Ingesta & Pre-procesamiento (Rust):**
   - Folder Watcher de ultra-bajo consumo de memoria con `notify` y `tokio`.
   - Hashing `SHA-256` instantáneo para deduplicación flash.
   - Fast PDF Triage y Clasificador nativo (`lopdf` + `knowledge_base.json`).
   - Pre-procesamiento de escaneos (Deskewing, Denoise, Binarización Otsu).
   - Publicación asíncrona hacia la cola de **Redis Stream**.

2. **🐍 Motor de Negocio, Auditoría & API (Python FastAPI):**
   - Consumidor Worker asíncrono de Redis.
   - Parser Espacial Heurístico (Ray-Casting de Anclas y Tablas).
   - Validador Aritmético Determinista ($\sum \text{items} = \text{Subtotal} \pm 0.02$) con soporte de descuentos y retenciones.
   - Servicio de conversión de divisas USD $\rightarrow$ COP con caché diaria (`currency_service.py`).
   - Sincronización multi-cuenta de correo (Gmail REST API OAuth 2.0 & IMAP SSL).
   - FastAPI REST API y canal WebSockets para feed en tiempo real.

3. **⚛️ Frontend Liquid Glass (React + Tailwind CSS + Vite):**
   - Estética **Silver Titanium & Warm Alabaster Liquid Glass**.
   - Sidebar colapsable con navegación SPA y badges de estado en vivo.
   - Componentes atómicos modulares (`InvoiceTable`, `DashboardFilters`, `BulkActionBar`).
   - Visor PDF interactivo con capa SVG de Bounding Boxes sincronizada bidireccionalmente.
   - Dashboard con multiselección, borrado masivo y estimación de costos IA.

---

## 📚 Índice de Documentación Técnica

- **Entregables Finales y Métricas:** [documentation/delivery/FINAL_DELIVERABLES.md](documentation/delivery/FINAL_DELIVERABLES.md)
- **Especificación de Negocio:** [documentation/business-doc.md](documentation/business-doc.md)
- **Arquitectura Backend:** [documentation/back/backend.md](documentation/back/backend.md)
- **Arquitectura Frontend:** [documentation/front/frontend.md](documentation/front/frontend.md)
- **Guía de Diseño Liquid Glass & Prompt Stitch:** [documentation/front/ui_design_and_stitch_prompt.md](documentation/front/ui_design_and_stitch_prompt.md)
- **Modelo de Base de Datos:** [documentation/db/db_v0.md](documentation/db/db_v0.md)
- **Backlog Jira-Ready (21 Historias / 138 SP):** [documentation/US/BACKLOG_SUMMARY.md](documentation/US/BACKLOG_SUMMARY.md)
- **Changelog Diario:** [documentation/changelog/](documentation/changelog/)
