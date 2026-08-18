# US-PY-004 — Conector Inbound Multi-Canal (Gmail / IMAP & Webhooks de n8n)
**Tipo:** Story | **SP:** 5 | **Prioridad:** Media (P1) | **Asignado:** Daniel
**Rama sugerida:** `feature/py-inbound-email-webhooks`

---

## 📖 Historia de Usuario
> "Como departamento financiero, quiero que el sistema Kono.ai vigile una bandeja de correo dedicada (Gmail / IMAP) o reciba webhooks de n8n con facturas adjuntas, para procesar automáticamente los comprobantes enviados por los proveedores por correo sin intervención humana."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] Implementa un worker asíncrono con `aiosmtpd` / `imaplib` que sondee la bandeja de entrada cada $N$ segundos o escuche notificaciones push IDLE.
- [ ] Descarga de forma segura los adjuntos válidos (`.pdf`, `.png`, `.jpg`, `.jpeg`) extrayendo además el emisor del correo (`From`), asunto (`Subject`) y fecha de recepción.
- [ ] Endpoint `POST /api/v1/inbound/webhook`: Endpoint seguro autenticado con API Key para recibir facturas enviadas desde flujos de n8n o Zapier.
- [ ] Guarda los archivos en el almacenamiento y emite el evento correspondiente a la cola de procesamiento.
- [ ] Marca el correo como "Procesado / Leído" en la bandeja para evitar descargas duplicadas.

---

## 📋 Subtasks Desglosadas por Capa

### 📧 [PY-EMAIL] Poller de Correo IMAP / Gmail
- [ ] Crear `backend/python-api/app/watcher/email_poller.py` con `aioimaplib`.
- [ ] Configurar variables de entorno `IMAP_HOST`, `IMAP_USER`, `IMAP_PASSWORD`, `IMAP_POLL_INTERVAL_SEC`.
- [ ] Parsear mensajes MIME extrayendo adjuntos binarios y metadatos del remitente.

### 🌐 [PY-WEBHOOK] Receptor de Webhooks Externos (n8n)
- [ ] Crear router `backend/python-api/app/api/v1/inbound.py` con endpoint `POST /webhook`.
- [ ] Implementar middleware de autenticación mediante header `X-Kono-Webhook-Secret`.
- [ ] Validar y guardar payloads multipart recibidos de n8n.

### 🧪 [TESTS & SIMULACIÓN]
- [ ] Crear test unitario `tests/test_email_poller.py` utilizando un servidor IMAP mockeado.
- [ ] Crear test de integración para el webhook enviando un PDF mediante `httpx`.
