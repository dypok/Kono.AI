# 📧 Guía de Ingesta Desatendida con n8n y Gmail en Kono.ai

Esta guía detalla cómo opera el flujo de **extracción 100% desatendida de facturas desde Gmail con n8n**. No requiere que el usuario cargue archivos manualmente ni ejecute comandos.

---

## 🔄 Arquitectura del Flujo Desatendido

```
                                    [ Proveedor / Remitente ]
                                               │
                                               ▼
                              [ Envía factura por correo a Gmail ]
                                               │
                                               ▼
               ┌───────────────────────────────────────────────────────────────┐
               │              🤖 N8N AUTOMATION ENGINE (Port 5678)             │
               │                                                               │
               │  1. [Nodo Gmail Trigger]: Sondea y filtra correos:            │
               │     "has:attachment (filename:pdf OR subject:factura)"        │
               │                                                               │
               │  2. [Extracción Binaria]: Descarga el PDF/Imagen adjunto      │
               │                                                               │
               │  3. [HTTP Request Multi-part POST]:                           │
               │     URL: http://kono-app:80/api/v1/inbound/webhook            │
               │     Header: X-Kono-Webhook-Secret                             │
               │                                                               │
               │  4. [Nodo Gmail Label]: Marca el correo como PROCESADO        │
               └───────────────────────────────┬───────────────────────────────┘
                                               │
                                               ▼
                 🦀 [Kono Rust Ingestion Core & 🐍 Python Deterministic Audit]
                                               │
                                               ▼
                   ⚛️ [Visor Split-Screen & Mascota Kono en tiempo real]
```

---

## 🚀 1. Importar el Flujo de Gmail en n8n (1-Click)

1. Abre tu n8n en el navegador:
   👉 **`http://localhost:5678`**
2. Haz clic en **"Import from File"** en el lienzo superior derecho.
3. Selecciona la plantilla creada:
   📁 [n8n/workflows/kono_gmail_auto_fetch_workflow.json](file:///home/dypok/Projects/Kono.AI/n8n/workflows/kono_gmail_auto_fetch_workflow.json)

---

## 🔑 2. Conectar tu Cuenta de Gmail en n8n

1. En el nodo **"Gmail Trigger"**, haz clic en **"Credential to connect with"** ➔ **Create New Credential**.
2. Selecciona **Gmail OAuth2** (o cuenta de servicio).
3. Inicia sesión con tu correo corporativo o de pruebas donde llegan las facturas de los proveedores.
4. Activa el interruptor **"Active"** en la esquina superior derecha del flujo.

---

## ⚡ 3. ¿Qué ocurre a partir de ese momento?

- **Cero intervención manual:** Cada vez que un proveedor envíe un correo con una factura adjunta (`.pdf`, `.png`, `.jpg`), n8n:
  1. Detecta el correo en tiempo real.
  2. Extrae el archivo adjunto y el remitente.
  3. Lo envía automáticamente al puerto `80` de Kono.ai.
  4. Rust realiza el **triage flash y hashing SHA-256** en menos de $1\text{ ms}$.
  5. Python ejecuta la **auditoría determinista** ($\Delta = \$0.00$).
  6. La factura aparece de inmediato en tu **Dashboard Liquid Glass** (`http://localhost/dashboard`) con su estado Kono (🟢 Verde, 🟡 Amarillo, 🔴 Rojo) lista para aprobación en 1-Click.
