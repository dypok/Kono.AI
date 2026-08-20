# 🪙 Kono.ai — Extractor, Validador y Reconciliador Inteligente de Facturas

> *"Cero digitación, cero descuadres: Kono procesa, audita y concilia tus facturas antes de que toquen tus libros contables."*

---

## 🚀 Visión General
**Kono.ai** es una plataforma de automatización de cuentas por pagar (AP Automation) y reconciliación contable diseñada para procesar cientos de facturas PDF e imágenes con latencia ultra-baja ($< 15\text{ ms}$), costo prácticamente nulo ($0 tokens en el 95% de los casos) y auditoría visual por excepción mediante la **Mascota Kono** (🟢 Verde, 🟡 Amarillo, 🔴 Rojo).

---

## 💻 Guía de Instalación y Ejecución Rápida (Mono-Docker All-in-One)

Todo el clúster (Redis + Rust Core + Python FastAPI con Hot-Reload + React/Nginx con Liquid Glass UI) está empaquetado y orquestado en un **único contenedor de alta eficiencia en el puerto 80**.

### 📋 Prerrequisitos
- **Docker** y **Docker Compose** instalados en tu máquina (Linux, macOS o Windows con WSL2).
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
*(Opcional: Si deseas habilitar el fallback selectivo con OpenAI para facturas complejas, ingresa tu `OPENAI_API_KEY` en el archivo `.env`).*

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
| **🐍 Backend API (FastAPI / Swagger)** | [http://localhost/api/v1/ping](http://localhost/api/v1/ping) | Endpoints de ingesta, auditoría determinista y triage. |
| **⚡ WebSocket Feed en Vivo** | `ws://localhost/api/v1/ws/audit-feed` | Canal WebSocket en tiempo real para transmisión de eventos. |
| **🤖 Automatizaciones n8n (Opcional)** | [http://localhost:5678](http://localhost:5678) | Orquestador de flujos inbound y conexión con ERPs. |

> [!TIP]
> **🔥 Auto-Update / Hot-Reload Activo:** Los cambios que guardes en el código de Python (`backend/python-api/app/`) se recargan instantáneamente en el contenedor sin necesidad de reconstruirlo.

---

### 🧪 Paso 5: Generar Facturas de Prueba Sintéticas
Para probar la ingesta y el motor de auditoría con facturas sintéticas (🟢 Válidas, 🟡 Descuadres y 🔴 Duplicadas):
```bash
# Crear entorno virtual local para el script generador (opcional)
python3 -m venv venv && source venv/bin/activate
pip install reportlab

# Generar lote de facturas de prueba
python scripts/invoices.py --output-dir ./test_invoices
```

---

## 🏗️ Arquitectura del Sistema (Dual-Backend)

1. **🦀 Core de Ingesta & Pre-procesamiento (Rust):**
   - Folder Watcher de ultra-bajo consumo de memoria con `notify` y `tokio`.
   - Hashing `SHA-256` instantáneo para deduplicación flash.
   - Fast PDF Triage y extracción de primitivas de texto/Bounding Boxes (`lopdf`).
   - Pre-procesamiento de escaneos (Deskewing, Denoise, Binarización Otsu).
   - Publicación asíncrona hacia la cola de **Redis Stream**.

2. **🐍 Motor de Negocio, Auditoría & API (Python FastAPI):**
   - Consumidor Worker asíncrono de Redis.
   - Parser Espacial Heurístico (Ray-Casting de Anclas y Tablas).
   - Validador Aritmético Determinista ($\sum \text{items} = \text{Subtotal} \pm 0.02$).
   - Auto-aprendizaje de plantillas de proveedor (`vendor_templates`).
   - Fallback selectivo a OpenAI (`gpt-4o-mini`) solo para casos con confianza $< 70\%$.
   - FastAPI REST API y canal WebSockets para feed en tiempo real.

3. **⚛️ Frontend Liquid Glass (React + Tailwind CSS + Vite):**
   - Estética **Silver Titanium & Warm Alabaster Liquid Glass**.
   - Sidebar colapsable con navegación SPA y badges de estado.
   - Login Mock con mascota Kono animada y acceso rápido en 1-Click.
   - Visor PDF interactivo con capa SVG de Bounding Boxes sincronizada bidireccionalmente.
   - Dashboard de lotes, KPIs de velocidad y botón de Aprobación en 1-Click.

---

## 📚 Índice de Documentación Técnica

- **Entregables Finales y Métricas:** [documentation/delivery/FINAL_DELIVERABLES.md](documentation/delivery/FINAL_DELIVERABLES.md)
- **Especificación de Negocio:** [documentation/business-doc.md](documentation/business-doc.md)
- **Arquitectura Backend:** [documentation/back/backend.md](documentation/back/backend.md)
- **Arquitectura Frontend:** [documentation/front/frontend.md](documentation/front/frontend.md)
- **Guía de Diseño Liquid Glass & Prompt Stitch:** [documentation/front/ui_design_and_stitch_prompt.md](documentation/front/ui_design_and_stitch_prompt.md)
- **Guía de Integración con n8n:** [documentation/integrations/n8n_guide.md](documentation/integrations/n8n_guide.md)
- **Modelo de Base de Datos:** [documentation/db/db_v0.md](documentation/db/db_v0.md)
- **Backlog Jira-Ready (12 Historias / 78 SP):** [documentation/US/BACKLOG_SUMMARY.md](documentation/US/BACKLOG_SUMMARY.md)
- **Changelog Diario:** [documentation/changelog/](documentation/changelog/)

---

## 👥 Equipo y Asignación de Roles

| Integrante | Rol Principal | Áreas de Responsabilidad |
| :--- | :--- | :--- |
| **Sayder** | Frontend Lead & UX/UI | React 18, Tailwind, Liquid Glass UI, Visor Split-Screen SVG, Mascota Kono, WebSockets UI |
| **Dylan** | Backend Engineer (Rust & Python) | Folder Watcher Rust, Hashing SHA-256, Motor Espacial Ray-Casting Python, CRUD FastAPI, n8n |
| **Daniel** | Backend Engineer (Rust & Python) | PDF Triage Rust, Pre-proc Imagen/OCR, Validador Aritmético Python, Fallback OpenAI, Docker |
