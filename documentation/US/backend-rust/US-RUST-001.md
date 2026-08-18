# US-RUST-001 — Daemon Folder Watcher & Deduplicador Flash SHA-256
**Tipo:** Story | **SP:** 5 | **Prioridad:** Alta (P0) | **Asignado:** Dylan
**Rama sugerida:** `feature/rust-folder-watcher-hasher`
**Estado:** ✅ DONE

---

## 📖 Historia de Usuario
> "Como sistema de ingesta financiera de Kono.ai, quiero monitorear de forma continua un directorio local o NFS y calcular el hash SHA-256 en microsegundos de cada comprobante entrante (PDF o imagen), para descartar duplicados antes de procesar y persistir el archivo en almacenamiento seguro con cero impacto en memoria RAM."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [x] El demonio se suscribe a eventos del kernel (`IN_CLOSE_WRITE` / `FSEvents`) mediante `notify` y `tokio` sin polling bloqueante.
- [x] Calcula el hash `SHA-256` utilizando la librería nativa `sha2` en $< 1 \text{ ms}$ por documento mediante streaming de bytes.
- [x] Mueve/copia el archivo entrante a la ruta de almacenamiento persistente (`/data/storage/processed/`) asignándole un `UUIDv4`.
- [x] Consulta el hash contra Redis/Base de Datos:
  - Si el hash **ya existe**: emite una alerta crítica inmediata de duplicado (`kono_state = RED`) y corta el flujo para evitar re-procesamiento.
  - Si es **nuevo**: despacha la ruta del archivo al pipeline de Triage de Rust.
- [x] El consumo de memoria RAM del servicio no supera los 15 MB bajo ráfagas de 500 archivos simultáneos.
- [x] Maneja de forma resiliente errores de permisos de archivo o lecturas parciales sin que el proceso colapse (recuperación con backoff).

---

## 📋 Subtasks Desglosadas por Capa

### ⚙️ [RUST-CORE] Configuración y Boilerplate
- [x] Inicializar el crate `kono-rust-core` en `backend/rust-core/` con `Cargo.toml` (`tokio = { version = "1", features = ["full"] }`, `notify = "6.1"`, `sha2 = "0.10"`, `uuid = { version = "1.6", features = ["v4"] }`, `tracing = "0.1"`).
- [x] Configurar el sistema de logging estructurado con `tracing-subscriber` para monitorear eventos en consola.
- [x] Crear módulo `src/config.rs` para parsear variables de entorno (`WATCH_DIR`, `STORAGE_DIR`, `REDIS_URL`).

### 📂 [RUST-WATCHER] Ingesta y Eventos de Sistema de Archivos
- [x] Implementar `src/watcher.rs` creando un watcher asíncrono con canal de Tokio (`tokio::sync::mpsc::channel`).
- [x] Filtrar únicamente eventos de finalización de escritura (`EventKind::Access(AccessKind::Close(AccessMode::Write))`) y extensiones soportadas (`.pdf`, `.png`, `.jpg`, `.jpeg`).
- [x] Implementar debounce de 150 ms para evitar procesar archivos que aún se estén transfiriendo lentamente.

### 🔒 [RUST-HASHER] Hashing y Deduplicación
- [x] Implementar `src/hasher.rs` con función `compute_sha256(file_path: &Path) -> io::Result<String>` usando `sha2::Sha256` y buffers de 64 KB.
- [x] Implementar conexión a Redis con `redis-rs` y verificar existencia del hash en el set `kono:document_hashes`.
- [x] Si existe: publicar alerta de duplicado en el canal `invoice_inbound_stream` con payload JSON (`document_id`, `file_hash`, `is_duplicate: true`).
- [x] Si no existe: guardar hash en Redis y mover archivo a `/data/storage/processed/<uuid>.<ext>`.

### 🧪 [TESTS & VERIFICACIÓN]
- [x] Crear test unitario `tests/hasher_test.rs` validando que el hash generado coincida exactamente con el output de `sha256sum` en Linux.
- [x] Crear test de integración `tests/watcher_integration_test.rs` simulando la creación de archivos simultáneos en carpeta temporal.
- [x] Verificar que no haya memory leaks ni saturación de recursos.

