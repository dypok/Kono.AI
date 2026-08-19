# US-INT-001 — Integración de Flujos de Automatización n8n & Pipeline Inbound
**Tipo:** Story | **SP:** 5 | **Prioridad:** Alta (P1) | **Asignado:** Dylan
**Rama sugerida:** `feature/integration-n8n-workflow-pipeline`
**Estado:** ✅ DONE

---

## 📖 Historia de Usuario
> "Como arquitecto de automatizaciones e integraciones contables, quiero un servicio de n8n orquestado en Docker Compose con un flujo de trabajo preconfigurado que vigile fuentes externas (carpetas compartidas, webhooks y correos), despache facturas hacia la API de Kono.ai mediante Webhook autenticado, y reciba notificaciones de reconciliación para sincronizar con ERPs externos."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [x] Servicio `n8n` orquestado en `docker-compose.yml` conectado a `kono-network` y persistiendo datos en un volumen dedicado `n8n_data`.
- [x] Plantilla de Workflow JSON lista para importar en `n8n/workflows/kono_inbound_workflow.json`:
  - Nodo 1: Trigger de Entrada (Webhook / Formulario / Schedule Trigger).
  - Nodo 2: Extracción y validación del archivo binario (`.pdf`, `.png`, `.jpg`).
  - Nodo 3: Nodo HTTP Request que envía `POST /api/v1/inbound/webhook` a `http://python-api:8000` con header `X-Kono-Webhook-Secret`.
  - Nodo 4: Nodo de Notificación / Log con la respuesta y estado de la factura.
- [x] Documentación técnica paso a paso en `documentation/integrations/n8n_guide.md` para importar y activar el workflow.

---

## 📋 Subtasks Desglosadas por Capa

### 🐳 [DEVOPS-N8N] Configuración Docker Compose
- [x] Agregar el servicio `n8n` (`docker.n8n.io/n8nio/n8n:latest`) en `docker-compose.yml` en el puerto `5678:5678`.
- [x] Configurar variables de entorno (`N8N_PORT`, `WEBHOOK_URL`, `GENERIC_TIMEZONE`).

### ⚙️ [WORKFLOW-N8N] Workflow JSON Exportable
- [x] Diseñar y crear `n8n/workflows/kono_inbound_workflow.json` listo para importación con 1-click en n8n.
- [x] Probar el envío de facturas desde n8n hacia `http://python-api:8000/api/v1/inbound/webhook`.

### 📚 [DOCUMENTATION] Guía de Uso & Conexión
- [x] Crear guía en `documentation/integrations/n8n_guide.md` con capturas conceptuales y ejemplos de ejecución.
