# US-PY-004 — Conector Inbound Multi-Canal (Gmail / IMAP & Webhook n8n)

**Historia de Usuario:** US-PY-004
**Asignado:** Daniel
**Rama:** `feature/py-inbound-email-webhooks`
**Versión:** 1.0.0 · **Fecha:** 18/08/2026
**Estándares:** `backend-architect` (diseño), `code-reviewer` (auto-revisión), OWASP
(validación de entrada, auth), SOLID/DRY, tests offline y deterministas.

---

## 1. Resumen

US-PY-004 implementa la **puerta de entrada multi-canal** de Kono.ai: permite recibir
facturas/comprobantes desde **webhooks externos (n8n)** y desde **correo (IMAP/Gmail)**
sin intervención humana, y los enruta al pipeline de procesamiento.

Esto cierra el flujo iniciado por **US-INT-001 (n8n)** de Dylan: n8n ya estaba
configurado (compose + workflow JSON) para llamar a `/api/v1/inbound/webhook`, pero el
**receptor backend no existía**. PY-004 lo implementa, haciendo que el flujo de n8n
funcione de punta a punta.

Alcance entregado:
1. **Webhook `POST /api/v1/inbound/webhook`** autenticado (n8n y cualquier fuente).
2. **Email/IMAP poller** (`aioimaplib`) que descarga adjuntos válidos y los ingesta.
3. **Unificación del secret** `WEBHOOK_SECRET` con el valor del workflow de n8n.
4. **Tests** (10) de webhook y email, offline.

---

## 2. Decisiones de Arquitectura (ADR)

### ADR-1 · Reutilizar el modelo `Document` y el storage `inbound/`
Tanto el webhook como el email poller **persisten dentro de `STORAGE_DIR/inbound`** y
registran un `Document` con `processing_status=PENDING`. Así el **mismo pipeline**
(watcher/triage de Rust + validador de PY-002) procesa los archivos sin importar su
origen. DRY: no se duplica lógica de persistencia.

### ADR-2 · Autenticación del webhook por header `X-Kono-Webhook-Secret`
El n8n workflow de Dylan envía ese header. El backend valida contra
`settings.webhook_secret` usando `hmac.compare_digest` (comparación a tiempo constante,
evita timing attacks). Sin header o con secreto inválido → `401`.

### ADR-3 · Unificación del secret
- Antes: compose exponía `WEBHOOK_SECRET` default `kono_secret`, pero el workflow de n8n
  hardcodeaba `kono_secret_n8n_key_2026`.
- Ahora: `WEBHOOK_SECRET` default = `kono_secret_n8n_key_2026` en `config.py`,
  `.env.example` y `docker-compose.yml`. El flujo funciona sin editar el JSON de n8n.

### ADR-4 · Email poller con lógica pura separada de la conexión
`DeferredEmailPoller` separa:
- **Lógica pura** (`extract_attachments`, `extract_metadata`, `is_attachment_supported`,
  parseo de IDs) → testeable sin servidor IMAP.
- **Capa de conexión** (`_connect`, `_poll_once`) usando `aioimaplib` de forma async,
  inyectable para tests.

### ADR-5 · Amenorre: no marcar como leído si falla el procesamiento
El poller solo marca `\Seen` cuando el adjunto se persistió con éxito, evitando pérdida
de comprobantes (si algo falla, el correo queda para reintento).

### ADR-6 · Límites de tamaño y whitelist de MIME
El webhook acepta solo `pdf/png/jpg/jpeg` y tiene un `MAX_INBOUND_BYTES` (15 MB)
defensivo contra subidas sin fin (OWASP — control de entrada en el límite de confianza).

---

## 3. Estructura del Código (nuevo en esta US)

```
backend/python-api/
├── app/
│   ├── api/v1/
│   │   └── inbound.py          # POST /webhook + GET /ping (auth, multipart)
│   ├── watcher/
│   │   ├── __init__.py
│   │   └── email_poller.py     # DeferredEmailPoller (aioimaplib)
│   └── core/config.py          # webhook_secret, imap_*, max_inbound_bytes
├── tests/
│   ├── test_inbound.py         # webhook: auth, MIME, éxito, DB
│   └── test_email_poller.py    # extracción de adjuntos + persistencia
```

---

## 4. Webhook de n8n / Externo

### 4.1 Contrato
```
POST /api/v1/inbound/webhook
Header:  X-Kono-Webhook-Secret: kono_secret_n8n_key_2026
Body:    multipart/form-data
         - file: <pdf/png/jpg>
         - source_tag: <string opcional>
Respuesta 201: { id, processing_status: "PENDING", kono_state: "YELLOW", message }
```

### 4.2 Flujo
`n8n (webhook) → FastAPI /inbound/webhook → auth → validar MIME/tamaño → guardar en
inbound/ → registrar Document(PENDING) → broadcast WebSocket → (pipeline lo procesa)`.

---

## 5. Email / IMAP Poller

- `DeferredEmailPoller.run()`: bucle async que se conecta a `IMAP_HOST:IMAP_PORT`,
  hace login con `IMAP_USER/IMAP_PASSWORD`, busca `UNSEEN`, descarga `RFC822`, parsea
  el MIME y extrae adjuntos `pdf/png/jpg`.
- Por cada adjunto: `persist_and_register` lo guarda en `inbound/` y crea un `Document`
  con metadatos del emisor (From, Subject, Date).
- Marca `\Seen` solo tras éxito. Intervalo configurable (`IMAP_POLL_INTERVAL_SEC`).
- Variables: `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASSWORD`,
  `IMAP_POLL_INTERVAL_SEC`.

---

## 6. Seguridad y Buenas Prácticas

- **Auth** con comparación a tiempo constante (`hmac.compare_digest`).
- **No secretos en el repo**: todo vía entorno (`.env`); el `.env.example` tiene un
  valor de desarrollo, no uno real de producción.
- **Validación de entrada** (MIME whitelist + límite de tamaño) en el límite de confianza.
- **Graceful degradation**: si el WebSocket falla, el webhook responde igual (best effort).
- Tests **offline**: email poller testea lógica pura; webhook con SQLite temporal.

---

## 7. Verificación

Corre todo en entorno limpio (Docker `python:3.11-slim`), offline:

| Suite | Resultado |
| :--- | :--- |
| `test_inbound.py` (auth ok/ko, MIME, éxito, DB) | 5 passed |
| `test_email_poller.py` (extracción, metadata, persistencia) | 5 passed |
| PY-001 / PY-002 / PY-003 | 35 passed |
| **TOTAL** | **45 passed** |

---

## 8. Integración con el resto del proyecto

- **US-INT-001 (n8n, Dylan)**: el workflow ya apunta a este endpoint → el flujo ahora
  funciona de punta a punta.
- **PY-003**: reutiliza el modelo `Document`, el storage `inbound/` y notifica por el
  `ws_manager`.
- **Rust (RUST-002)**: el watcher de triage toma los archivos de `inbound/`.
- **Validador (PY-002)**: procesa y asigna estado Kono a los documentos entrantes.

---

## 9. Trabajo Futuro

- Disparar el `DeferredEmailPoller.run()` automáticamente al arranque de la API cuando
  `IMAP_USER` esté configurado (background task), hoy queda disponible pero no
  auto-iniciado en desarrollo.
- Autenticación más fuerte (firmas HMAC por fuente, rate limiting) para el webhook.
- Encolar el archivo entrante directamente al `invoice_processing_stream` (hoy el
  pipeline lo toma vía el watcher por el folder `inbound/`).

---

*Documento mantenido con el protocolo de changelog del workspace. Toda modificación
debe registrarse en `documentation/changelog/`.*
