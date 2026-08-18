# 🪙 Kono.ai — Extractor, Validador y Reconciliador Inteligente de Facturas

> *"Cero digitación, cero descuadres: Kono procesa, audita y concilia tus facturas antes de que toquen tus libros contables."*

---

## 🚀 Visión General
**Kono.ai** es una plataforma de automatización de cuentas por pagar (AP Automation) y reconciliación contable diseñada para procesar cientos de facturas PDF e imágenes con latencia ultra-baja ($< 15\text{ ms}$), costo prácticamente nulo ($0 tokens en el 95% de los casos) y auditoría visual por excepción mediante la **Mascota Kono** (🟢 Verde, 🟡 Amarillo, 🔴 Rojo).

---

## 💻 Guía de Instalación y Ejecución Rápida

### 📋 Prerrequisitos
- **Docker** y **Docker Compose** instalados en tu máquina (Linux, macOS o Windows con WSL2).
- **Git** instalado.

---

### ⚡ Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/Kono.AI.git
cd Kono.AI
```

---

### ⚙️ Paso 2: Configurar Variables de Entorno
Copia la plantilla de configuración `.env.example` a `.env`:
```bash
cp .env.example .env
```
*(Opcional: Si deseas habilitar el fallback selectivo con OpenAI para facturas con confianza $< 70\%$, ingresa tu `OPENAI_API_KEY` dentro del archivo `.env`).*

---

### 🐳 Paso 3: Levantar el Entorno con Docker Compose (Hot-Reload Activado)
Ejecuta el siguiente comando para compilar las imágenes e iniciar todos los servicios:
```bash
docker compose up --build
```
*Para ejecutarlo en segundo plano (modo detached):*
```bash
docker compose up -d
```

---

### 🌐 Paso 4: Acceder a los Servicios

Una vez levantado el stack, los servicios estarán disponibles en:

| Servicio | URL Local | Descripción |
| :--- | :--- | :--- |
| **⚛️ Frontend App (React + Tailwind)** | [http://localhost:3000](http://localhost:3000) | Dashboard de auditoría Split-Screen y Mascota Kono interactiva con Hot-Reload (Vite HMR). |
| **🐍 Backend API (FastAPI / Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Documentación interactiva de la API REST y endpoints de auditoría. |
| **⚡ WebSocket Feed en Vivo** | `ws://localhost:8000/api/v1/ws/audit-feed` | Canal WebSocket en tiempo real para transmisión de documentos procesados. |
| **🔴 Redis Broker & Colas** | `localhost:6379` | Broker en memoria de eventos y tareas asíncronas. |
| **🦀 Rust Core (Ingesta)** | `kono-rust-core` | Servicio interno escuchando eventos en `/data/storage/inbound/`. |

---

### 🧪 Paso 5: Generar Facturas de Prueba Sintéticas
Para probar la ingesta y el motor de auditoría con facturas de prueba (🟢 Válidas, 🟡 Descuadres y 🔴 Duplicadas):
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

- **Entregables Finales y Métricas:** [documentation/delivery/FINAL_DELIVERABLES.md](documentation/delivery/FINAL_DELIVERABLES.md)
- **Especificación de Negocio:** [documentation/business-doc.md](documentation/business-doc.md)
- **Arquitectura Backend:** [documentation/back/backend.md](documentation/back/backend.md)
- **Arquitectura Frontend:** [documentation/front/frontend.md](documentation/front/frontend.md)
- **Modelo de Base de Datos:** [documentation/db/db_v0.md](documentation/db/db_v0.md)
- **Backlog & Historias de Usuario Jira-Ready (65 SP):** [documentation/US/BACKLOG_SUMMARY.md](documentation/US/BACKLOG_SUMMARY.md)
  - 🦀 [Historias Backend Rust (Dylan & Daniel)](documentation/US/backend-rust/)
  - 🐍 [Historias Backend Python (Dylan & Daniel)](documentation/US/backend-python/)
  - ⚛️ [Historias Frontend React (Sayder)](documentation/US/frontend/)
- **Guía de Instalación Universal de Skill & Reglas:** [INSTALL_SKILL.md](INSTALL_SKILL.md)
- **Changelog Diario:** [documentation/changelog/](documentation/changelog/)

---

## 👥 Equipo y Asignación de Roles

| Integrante | Rol Principal | Áreas de Responsabilidad |
| :--- | :--- | :--- |
| **Sayder** | Frontend Lead & UX/UI | React 18, Tailwind, Visor Split-Screen SVG, Mascota Kono, WebSockets UI |
| **Dylan** | Backend Engineer (Rust & Python) | Folder Watcher Rust, Hashing SHA-256, Motor Espacial Ray-Casting Python, CRUD FastAPI |
| **Daniel** | Backend Engineer (Rust & Python) | PDF Triage Rust, Pre-proc Imagen/OCR, Validador Aritmético Python, Fallback OpenAI, Docker |
