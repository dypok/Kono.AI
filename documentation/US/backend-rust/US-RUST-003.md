# US-RUST-003 — Pipeline de Ingesta Masiva, Manejo de Concurrencia & Resiliencia I/O
**Tipo:** Story | **SP:** 5 | **Prioridad:** Media (P1) | **Asignado:** Dylan & Daniel (Compartida)
**Rama sugerida:** `feature/rust-concurrency-resilience-pipeline`
**Estado:** ✅ DONE

---

## 📖 Historia de Usuario
> "Como motor de ingesta de alta carga, quiero procesar ráfagas de cientos de archivos PDF e imágenes concurrentemente con un ThreadPool no bloqueante (`rayon` / `tokio::spawn`), reintentos exponenciales y manejo de archivos corruptos o bloqueados por el SO, para garantizar cero caídas y cero pérdida de comprobantes en días de cierre contable."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [x] Procesa un lote de 500 archivos entrantes de forma concurrente con un semáforo de concurrencia (`tokio::sync::Semaphore`) limitado a la cantidad de cores de CPU disponibles (evitando saturación de file descriptors `EMFILE`).
- [x] Si un archivo está bloqueado temporalmente por el sistema operativo mientras se copia (ej. NFS lento o ráfaga de red), aplica 3 reintentos con backoff exponencial (100ms, 300ms, 900ms).
- [x] Si un archivo está corrupto o protegido con contraseña desconocida:
  - Mueve el archivo a `/data/storage/failed/`.
  - Publica un evento de error controlado en Redis con `status: "CORRUPTED_FILE"`.
  - El proceso NO se detiene ni entra en pánico (`panic!`).
- [x] Implementa graceful shutdown: al recibir `SIGINT` o `SIGTERM`, termina de procesar los archivos en curso antes de cerrar conexiones a Redis.

---

## 📋 Subtasks Desglosadas por Capa

### ⚙️ [RUST-CONCURRENCY] Semáforos & ThreadPool
- [x] Configurar `tokio::sync::Semaphore` en `src/pipeline.rs` para limitar las tareas concurrentes de I/O de disco a $N$ workers (por defecto `num_cpus::get() * 2`).
- [x] Envolver cada tarea de triage de PDF en `tokio::spawn` para desacoplar la ingesta del watcher.

### 🛡️ [RUST-RESILIENCE] Resiliencia, Reintentos & Dead-Letter Queue
- [x] Implementar función `safe_read_file(path: &Path)` con reintentos para manejar bloqueos de lectura temporal en Linux/Windows.
- [x] Implementar aislamiento de errores con `Result<T, CustomError>` en `src/errors.rs` eliminando cualquier `unwrap()` inseguro en el código de producción.
- [x] Crear directorio `/data/storage/failed/` y mover archivos con error de formato o cifrado.

### 🧪 [TESTS & STRESS TESTING]
- [x] Crear test de estrés `tests/concurrency_stress_test.rs` lanzando escrituras concurrentes en una carpeta temporal y verificando que los archivos se procesen sin errores de descriptor.
- [x] Simular un archivo truncado a la mitad y verificar que se enrute a `/failed/` sin provocar pánico en el runtime.

