# US-RUST-001 — Daemon Folder Watcher & Deduplicador Flash SHA-256
**Tipo:** Story | **SP:** 5 | **Prioridad:** Alta (P0) | **Asignado:** Dylan
**Rama sugerida:** `feature/rust-folder-watcher-hasher`

---

## 📖 Historia de Usuario
> "Como sistema de ingesta financiera de Kono.ai, quiero monitorear de forma continua un directorio local o NFS y calcular el hash SHA-256 en microsegundos de cada comprobante entrante (PDF o imagen), para descartar duplicados antes de procesar y persistir el archivo en almacenamiento seguro con cero impacto en memoria RAM."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [ ] El demonio se suscribe a eventos del kernel (`IN_CLOSE_WRITE` / `FSEvents`) mediante `notify` y `tokio` sin polling bloqueante.
- [ ] Calcula el hash `SHA-256` utilizando la librería nativa `sha2` en $< 1 \text{ ms}$ por documento mediante streaming de bytes.
- [ ] Mueve/copia el archivo entrante a la ruta de almacenamiento persistente (`/data/storage/inbound/`) asignándole un `UUIDv4`.
- [ ] Consulta el hash contra Redis/Base de Datos:
  - Si el hash **ya existe**: emite una alerta crítica inmediata de duplicado (`kono_state = RED`) y corta el flujo para evitar re-procesamiento.
  - Si es **nuevo**: despacha la ruta del archivo al pipeline de Triage de Rust.
- [ ] El consumo de memoria RAM del servicio no supera los 15 MB bajo ráfagas de 500 archivos simultáneos.
- [ ] Maneja de forma resiliente errores de permisos de archivo o lecturas parciales sin que el proceso colapse (recuperación con backoff).

---

## 📋 Subtasks Desglosadas por Capa

### ⚙️ [RUST-CORE] Configuración y Boilerplate
- [ ] Inicializar el crate `kono-rust-core` en `backend/rust-core/` con `Cargo.toml` (`tokio = { version = "1", features = ["full"] }`, `notify = "6.1"`, `sha2 = "0.10"`, `uuid = { version = "1.6", features = ["v4"] }`, `tracing = "0.1"`).
- [ ] Configurar el sistema de logging estructurado con `tracing-subscriber` para monitorear eventos en consola.
- [ ] Crear módulo `src/config.rs` para parsear variables de entorno (`WATCH_DIR`, `STORAGE_DIR`, `REDIS_URL`).

### 📂 [RUST-WATCHER] Ingesta y Eventos de Sistema de Archivos
- [ ] Implementar `src/watcher.rs` creando un watcher asíncrono con canal de Tokio (`tokio::sync::mpsc::channel`).
- [ ] Filtrar únicamente eventos de finalización de escritura (`EventKind::Access(AccessKind::Close(AccessMode::Write))`) y extensiones soportadas (`.pdf`, `.png`, `.jpg`, `.jpeg`).
- [ ] Implementar debounce de 100 ms para evitar procesar archivos que aún se estén transfiriendo lentamente.

### 🔒 [RUST-HASHER] Hashing y Deduplicación
- [ ] Implementar `src/hasher.rs` con función `calculate_sha256(file_path: &Path) -> Result<String, Error>` usando `sha2::Sha256` y buffers de 64 KB.
- [ ] Implementar conexión a Redis con `redis-rs` y verificar existencia del hash en el set `kono:document_hashes`.
- [ ] Si existe: publicar alerta de duplicado en el canal `kono_alerts_stream` con payload JSON (`document_id`, `file_hash`, `status: "DUPLICATE"`).
- [ ] Si no existe: guardar hash en Redis con `SETEX kono:hash:<hash> 86400 <doc_id>` y mover archivo a `/data/storage/inbound/<uuid>.<ext>`.

### 🧪 [TESTS & VERIFICACIÓN]
- [ ] Crear test unitario `tests/hasher_test.rs` validando que el hash generado coincida exactamente con el output de `sha256sum` en Linux.
- [ ] Crear test de integración `tests/watcher_test.rs` simulando la creación de 50 archivos simultáneos en una carpeta temporal.
- [ ] Verificar que no haya memory leaks ejecutando `cargo valgrind test` o `valgrind --leak-check=full`.
