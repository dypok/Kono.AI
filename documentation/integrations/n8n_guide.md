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

En la raíz del proyecto se encuentra la plantilla lista para importar:
📁 [n8n/workflows/kono_inbound_workflow.json](file:///home/dypok/Projects/Kono.AI/n8n/workflows/kono_inbound_workflow.json)

### Pasos en la interfaz de n8n (dónde se arma el flujo visual):
1. Abre `http://localhost:5678` en tu navegador y completa la configuración inicial de cuenta.
2. En el menú superior derecho, haz clic en **"Import from File"** (o arrastra el archivo `.json`).
3. Selecciona `n8n/workflows/kono_inbound_workflow.json`.
4. **El flujo visual se dibuja en el canvas del editor** de n8n (nodos arrastrables y conectables).
5. Para **activarlo**, marca el trigger webhook como **Active**. Puedes probarlo primero con
   la URL `/webhook-test/kono-inbound-invoice` y, cuando funcione, activarlo en la URL de
   producción `/webhook/kono-inbound-invoice`.

> El flujo visual se edita en la interfaz de n8n; el `.json` es solo la plantilla
> importable que lo reproduce.

---

## 🔑 2. Conectar tu Cuenta de Gmail en n8n

1. En el nodo **"Gmail Trigger"**, haz clic en **"Credential to connect with"** ➔ **Create New Credential**.
2. Selecciona **Gmail OAuth2** (o cuenta de servicio).
3. Inicia sesión con tu correo corporativo o de pruebas donde llegan las facturas de los proveedores.
4. Activa el interruptor **"Active"** en la esquina superior derecha del flujo.

---

## ⚡ 3. ¿Qué ocurre a partir de ese momento?

El flujo procesará el archivo binario, lo transferirá a la API de Kono.ai y retornará el identificador del documento procesado en milisegundos.

---

## 🔐 5. Endpoint Backend (US-PY-004) — Implementado

El receptor del webhook está **implementado** en FastAPI (US-PY-004):

```
POST /api/v1/inbound/webhook
Header: X-Kono-Webhook-Secret: <valor de WEBHOOK_SECRET>
Body (multipart/form-data): file=<archivo pdf/png/jpg>, source_tag=<origen>
```

- **Auth**: valida el header `X-Kono-Webhook-Secret` contra `WEBHOOK_SECRET` (default
  `kono_secret_n8n_key_2026`, coincidiendo con la plantilla de n8n).
- **MIME**: solo `application/pdf`, `image/png`, `image/jpeg`.
- **Persistencia**: guarda el archivo en `STORAGE_DIR/inbound`, registra un `Document`
  (estado `PENDING`) y notifica por WebSocket.
- **Procesamiento**: el archivo en `inbound/` es tomado por el pipeline (watcher/triage)
  → validador → estado Kono.

> Si cambias `WEBHOOK_SECRET` en el entorno, actualiza también el nodo HTTP de n8n
> (`X-Kono-Webhook-Secret`) para que ambos coincidan.

### Probar el endpoint directamente (sin n8n):
```bash
curl -X POST http://localhost:8000/api/v1/inbound/webhook \
  -H "X-Kono-Webhook-Secret: kono_secret_n8n_key_2026" \
  -F "file=@scripts/factura_valida.pdf" \
  -F "source_tag=manual_test"
```
