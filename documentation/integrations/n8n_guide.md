# 🤖 Guía de Integración y Automatización con n8n en Kono.ai

Esta guía describe cómo utilizar la plataforma de automatización de flujos **n8n** integrada en el Docker Compose de Kono.ai para recibir facturas automáticamente desde cualquier fuente externa (Gmail, Slack, Drive, Webhooks o formularios) y enviarlas hacia el motor de auditoría determinista de Kono.ai.

---

## 🚀 1. Levantar n8n en Docker Compose

El servicio `n8n` ya está preconfigurado en el archivo [docker-compose.yml](file:///home/dypok/Projects/Kono.AI/docker-compose.yml):

```bash
docker compose up -d n8n
```

- **URL de n8n:** `http://localhost:5678`
- **Volumen persistente:** `n8n_data` (almacena credenciales y workflows sin pérdida de datos).
- **Red interna:** Se comunica con FastAPI mediante `http://python-api:8000`.

---

## 📥 2. Importar el Flujo Preconfigurado (1-Click)

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

## 🔄 3. Arquitectura del Flujo de Trabajo

```
 [Fuente Externa: Correo / ERP / Formulario]
                     │
                     ▼
       [Node 1: Webhook Trigger n8n]
        URL: http://localhost:5678/webhook/kono-inbound-invoice
                     │
                     ▼
    [Node 2: HTTP Request multipart/form-data]
    POST http://python-api:8000/api/v1/inbound/webhook
    Header: X-Kono-Webhook-Secret: kono_secret_n8n_key_2026
                     │
                     ▼
 🦀 [Kono Rust Triage + 🐍 Python Deterministic Audit Engine]
```

---

## 🧪 4. Prueba Rápida con cURL

Puedes enviar una factura de prueba al Webhook de n8n para verificar el flujo de extremo a extremo:

```bash
curl -X POST http://localhost:5678/webhook-test/kono-inbound-invoice \
  -F "data=@scripts/factura_valida.pdf"
```

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
