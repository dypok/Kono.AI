# 🦀 Kono.ai — Rust Core: Documentación Técnica de Implementación

**Historia de Usuario:** US-RUST-002 — *Fast PDF Triage, Pre-procesamiento de Imágenes & Publicador Redis*
**Rama:** `feature/rust-pdf-triage-img-preprocessor`
**Autor:** Daniel Echeverría
**Versión:** 1.0.0 · **Fecha:** 18/08/2026
**Especificación base:** [`documentation/back/backend.md`](./backend.md)

---

## Tabla de Contenidos

1. [Contexto y Objetivos](#1-contexto-y-objetivos)
2. [Decisiones de Arquitectura (ADR)](#2-decisiones-de-arquitectura-adr)
3. [Estructura del Código](#3-estructura-del-código)
4. [Contrato de Datos: `types.rs`](#4-contrato-de-datos-typesrs)
5. [Gestión de Errores: `errors.rs`](#5-gestión-de-errores-errorsrs)
6. [Triage Vectorial de PDF: `pdf_triage.rs`](#6-triage-vectorial-de-pdf-pdf_triagers)
7. [Pre-procesamiento de Imágenes y OCR: `img_preprocessor.rs`](#7-pre-procesamiento-de-imágenes-y-ocr-img_preprocessors)
8. [Publicador Redis: `queue_publisher.rs`](#8-publicador-redis-queue_publisherrs)
9. [Orquestación del Daemon: `main.rs`](#9-orquestación-del-daemon-mainrs)
10. [Flujo de Datos End-to-End](#10-flujo-de-datos-end-to-end)
11. [Estrategia de Testing y Verificación](#11-estrategia-de-testing-y-verificación)
12. [Limitaciones Conocidas y Trabajo Futuro](#12-limitaciones-conocidas-y-trabajo-futuro)

---

## 1. Contexto y Objetivos

Kono.ai audita facturas de manera geométrica y determinista. Para lograrlo necesita
**primitivas geométricas** (palabras con sus coordenadas) extraídas de los
comprobantes lo más rápido y barato posible, antes de que el motor Python haga la
auditoría financiera.

El **Rust Core** es la primera estación del pipeline: se encarga del **I/O intensivo**
y de convertir archivos opacos (PDF, escaneos) en un **payload JSON normalizado**
que viaja por Redis hacia la capa de negocio.

¿Por qué Rust para esta etapa?

- **Velocidad**: la extracción de texto vectorial y el pre-procesado de imágenes son
  operaciones de CPU/memoria que Rust ejecuta en el orden de **milisegundos** sin GC.
- **Seguridad de memoria**: procesar archivos corruptos o maliciosos no debe tumbar el
  daemon. El sistema de ownership de Rust garantiza ausencia de *use-after-free* y
  *data races* por construcción.
- **Bajo consumo**: un folder watcher de miles de archivos con < 10 MB de RAM.
- **Boundary claro**: separa la ingesta pesada (Rust) del negocio flexible (Python).

El objetivo de **US-RUST-002** es específico: dado un archivo que llega al directorio
`inbound`, decidir si es un **PDF digital** (capa vectorial) o un **escaneo/imagen**
(sin texto), extraer las palabras con sus bounding boxes y **publicar el resultado
normalizado en el Redis Stream** `invoice_processing_stream` para que Python lo consuma.

---

## 2. Decisiones de Arquitectura (ADR)

Estas son las decisiones relevantes, el *por qué* y el *qué se descartó*.

### ADR-1 · Extractor PDF: `lopdf` en lugar de `pdfium-render`

**Contexto**: la US ofrecía dos opciones (`lopdf` o `pdfium-render`).

**Decisión**: `lopdf = "0.34"`.

| Criterio | `lopdf` | `pdfium-render` |
| :--- | :--- | :--- |
| Compilación | 100% Rust puro | Wrapper de la librería C++ `PDFium` |
| Binarios nativos | No | Requiere descargar/comprilar PDFium (frágil en Docker) |
| Acceso a operadores de contenido | Directo (`Tj`, `TJ`, `Tm`) | Envuelto en capas de alto nivel |
| Imagen final en Docker | Liviana (sin toolchain C++) | Pesada |

**Razón**: `pdfium-render` agrega una dependencia binaria C++ que complica el build
multi-etapa de Docker y el CI. `lopdf` nos da acceso **directo al stream de
operadores PDF** (`Tj`, `TJ`, `Tm`, `Td`, `Tf`), que es exactamente lo que la US pide
iterar para calcular bounding boxes. El requisito de la US era "lopdf **o** pdfium",
así que se eligió la opción con menor fricción operativa.

### ADR-2 · OCR: binario `tesseract` (CLI) en lugar de crates C-FFI

**Contexto**: la US pedía "OCR posicional local ultraligero (RapidOCR / Tesseract C-API)".

**Decisión**: invocar el binario `tesseract` vía `std::process::Command` con salida
`tsv`, parseando la tabla de nivel 5 (palabras).

- El `Dockerfile` del core ya instala `tesseract-ocr` (+ idiomas `eng`/`spa`).
- Tesseract con salida `tsv` entrega **por palabra**: `texto, left, top, width, height,
  conf` — exactamente lo que necesitamos para construir bboxes.
- Usar la C-API (`tesseract-sys`) o `rapidocr` (ONNX) agregaría dependencias de build
  (bindings, modelos pre-entrenados) sin aportar nada al contrato de datos.
- `rapidocr` además requiere un modelo ONNX descargable → rompe la filosofía
  "determinista y offline" del core.

**Riesgo asumido**: dependemos de que `tesseract` esté en el `PATH` del contenedor.
Está garantizado por el `Dockerfile`; el código falla con un error descriptivo
(`KonoError::Tesseract`) si no está.

### ADR-3 · Cola: Redis **Stream** (`XADD`) en lugar de lista `LPUSH`

**Contexto**: `backend.md` mencionaba ambas (`LPUSH invoice_queue` o Redis Stream).

**Decisión**: `XADD invoice_processing_stream * payload <json>`.

- Los Streams de Redis (≥5.0) son **append-only logs** pensados para colas de
  eventos: cada mensaje recibe un **ID de entrada inmutable** que Python puede
  usar para `XREADGROUP`/`XACK` (procesamiento *at-least-once* sin perder mensajes).
- El ID autogenerado nos sirve como **número de trazabilidad** del lote.
- Con `LPUSH` la semántica de consumo/reintento es manual y propensa a pérdidas.

### ADR-4 · Conexión Redis: `ConnectionManager` (reconexión automática)

**Decisión**: `redis::aio::ConnectionManager` (feature `connection-manager` del crate `redis`).

La US pedía `MultiplexedConnection`. `ConnectionManager` **envuelve** una conexión
multiplexada y agrega **reconexión transparente** si Redis se reinicia o cae. Esto
cumple *de más* el requisito: el daemon no muere cuando Redis tiene una latencia
momentánea — justo el requisito de resiliencia que la US-RUST-003 refuerza.

### ADR-5 · Sistema de coordenadas: puntos PDF, origen **bottom-left**

**Decisión**: el contrato `bbox: [x0, y0, x1, y1]` usa **puntos PDF (1/72 pulgada)**
con origen en la **esquina inferior izquierda**, que es el sistema nativo de PDF.

- Para **PDF vectorial** no hay conversión: tomamos las coordenadas tal cual vienen
  de las matrices de texto (consistente con el ejemplo de la US, donde `y0=720` está
  arriba en una página A4 de 842pt).
- Para **imágenes** (Tesseract trabaja en píxeles, origen arriba-izquierda) convertimos:
  `y_pdf = image_height − (top + height)`, asumiendo 72 dpi (1 px ≈ 1 pt).
  Esto mantiene **un único sistema de coordenadas** en todo el pipeline, de modo que
  el motor espacial de Python no necesita saber el origen del documento.

### ADR-6 · Disparo de ingesta: **polling** en lugar de `notify` (por ahora)

**Contexto**: el folder watcher basado en `notify` (inotify/FSEvents) pertenece a
**US-RUST-001** (Dylan). US-RUST-002 no debe invadir esa responsabilidad.

**Decisión**: `main.rs` escanea el directorio `inbound` cada 3 segundos
(`SCAN_INTERVAL_SECS = 3`), ignorando archivos temporales (`.tmp`, `.part`).

- Evita pisar el watcher de US-RUST-001 cuando se integre.
- Mantiene el pipeline **funcional de forma independiente** y testeable.
- El set `processed` en memoria evita re-procesar archivos ya publicados.

### ADR-7 · Crate `lib` + `bin` para permitir tests de integración

**Decisión**: `src/lib.rs` expone los módulos y `src/main.rs` es un binario delgado
que los consume.

- Los tests de integración (`tests/*.rs`) solo pueden importar **crates de
  librería**, no bins. Dividir lib/bin permite tener `tests/pdf_triage_test.rs` e
  `tests/img_preprocessor_test.rs` como exige la US.
- El binario compilado sigue llamándose `kono-rust-core` → el `Dockerfile` no cambia.

---

## 3. Estructura del Código

```
backend/rust-core/
├── Cargo.toml              # Dependencias y perfil release con LTO
├── Cargo.lock              # Bloqueo de versiones (reproducibilidad del build)
├── Dockerfile              # Multi-etapa: build + runtime con tesseract
├── src/
│   ├── lib.rs              # Superficie pública de la librería (módulos)
│   ├── main.rs             # Binario: daemon de escaneo y orquestación
│   ├── errors.rs           # KonoError: tipo de error unificado
│   ├── types.rs            # Contrato de datos (DocumentPayload, Word)
│   ├── pdf_triage.rs       # Triage y extracción vectorial de PDFs
│   ├── img_preprocessor.rs # Deskew, Otsu y OCR para escaneos/imágenes
│   └── queue_publisher.rs  # Publicador al Redis Stream
└── tests/
    ├── pdf_triage_test.rs      # Tests de integración PDF (digital vs scan)
    └── img_preprocessor_test.rs # Tests de integración visión + OCR
```

### Dependencias clave (`Cargo.toml`)

```toml
lopdf = "0.34"            # Parsing de PDFs y extracción de operadores de texto
image = "0.24"            # Decodificación y procesado de imágenes (deskew, Otsu)
redis = { version = "=0.25.3", features = ["tokio-comp", "connection-manager"] }
sha2  = "=0.10.8"         # Hash SHA-256 para deduplicación flash
serde / serde_json        # Serialización del contrato de datos
thiserror = "1"           # Deriva de implementación de std::error::Error
tokio = { version = "=1.38.1", features = ["full"] }
uuid  = { version = "=1.8.0", features = ["v4", "serde"] }

[dev-dependencies]
tempfile = "3"            # Directorios temporales en tests
font8x8  = "0.2"          # Fuente bitmap para generar imágenes de test sin OCR real
```

> Las versiones se fijaron con `=` (pinned) para **reproducibilidad**: el `Cargo.lock`
> se commitea y el `Dockerfile` lo copia (`COPY Cargo.toml Cargo.lock* ./`), de modo
> que dos builds idénticos dan bit a bit el mismo binario.

---

## 4. Contrato de Datos: `types.rs`

El corazón del sistema es el **contrato JSON** que Rust produce y Python consume.
Por eso se define primero, con `serde`.

```rust
pub struct Word {
    pub text: String,        // La palabra extraída
    pub bbox: [f64; 4],      // [x0, y0, x1, y1] en puntos PDF, origen bottom-left
    pub page: u32,           // Número de página (1-indexed)
    pub confidence: f64,     // 0.0..=1.0 (1.0 en texto vectorial, conf/100 en OCR)
}

pub struct DocumentPayload {
    pub document_id: String, // UUID v4 generado al procesar
    pub file_hash: String,   // SHA-256 del archivo (deduplicación flash)
    pub file_path: String,   // Ruta original en storage
    pub is_digital: bool,    // true = PDF con capa vectorial, false = escaneo/imagen
    pub pages_count: u32,    // Número de páginas del documento
    pub words: Vec<Word>,    // Primitivas geométricas listas para auditar
}
```

**¿Por qué un `bbox` como `[f64; 4]` en lugar de un struct?**

- La US define el payload de ejemplo exactamente así (`"bbox": [100.5, 720.0, 180.2, 735.0]`).
- Mantener el contrato byte-a-byte igual al spec elimina ambigüedad entre capas.
- `serde` serializa un array de 4 `f64` directamente a JSON sin transformaciones.

**¿Por qué `f64`?** Las coordenadas PDF pueden ser sub-pixel y las operaciones
aritméticas del motor Python (deltas de ±0.02) exigen precisión. `f32` perdería
precisión en sumas largas de ítems.

**¿Por qué `confidence` en texto vectorial = 1.0?** El texto vectorial es extraído del
propio PDF, no reconocido: es *dato*, no *inferencia*. La confianza solo tiene sentido
en OCR. Así, el validador Python puede confiar ciegamente en los bboxes digitales.

---

## 5. Gestión de Errores: `errors.rs`

**Regla de oro del core**: *ningún archivo corrupto puede tumbar el daemon*.
Esto se garantiza con un tipo de error unificado y la prohibición de `unwrap()`/`panic!`
en rutas de producción.

```rust
pub enum KonoError {
    Io, Pdf, Image, Redis, Json,     // Errores de infraestructura (con `#[from]`)
    Tesseract(String),               // OCR ausente o fallido (mensaje legible)
    UnsupportedFile(String),         // Extensión no soportada
    EmptyDocument(String),           // PDF sin capa de texto (se trata como scan)
    Config(String),                  // Errores de configuración/entorno
}
```

**¿Por qué `thiserror`?** Deriva automáticamente `std::error::Error`, lo que permite:
- `#[from]` → propagar errores con `?` sin boilerplate.
- `#[error("...")]` → mensajes descriptivos y accionables para los logs.
- Mantener **todas** las fallas bajo un único tipo → el orquestador (`main.rs`) puede
  manejarlas de forma homogénea (loggear, mover a `/failed/`, seguir vivo).

> Nótese la variante `EmptyDocument(String)`: un PDF "escaneado" (sin texto vectorial)
> **no es un error** a nivel de pipeline, solo significa que el documento irá por la
> ruta de OCR. Por eso `pdf_triage.rs` la maneja internamente y devuelve `words = []`
> con `is_digital = false`, en lugar de abortar el lote.

---

## 6. Triage Vectorial de PDF: `pdf_triage.rs`

### 6.1 Concepto: ¿qué es un "PDF digital"?

Un PDF puede contener el texto como **capa vectorial** (cada carácter es un glifo con
coordenadas) o como **imagen rasterizada** (un escaneo). El triage decide cuál es.

```rust
const DIGITAL_TEXT_THRESHOLD_CHARS: usize = 50;
```

Si el documento expone **> 50 caracteres extraíbles** en total, se considera digital.
Por debajo de eso se asume que la página es un escaneo (o texto residual/ocr oculto)
y se marca `is_digital = false` para que el visor/worker sepa que el bbox vino de OCR.

### 6.2 Extracción vectorial: leyendo los operadores del PDF

Un PDF guarda su contenido como un **lenguaje de operadores**. Para saber dónde está
cada palabra, hay que rastrear el **estado de renderizado** del texto:

| Operador | Significado | Uso en el código |
| :--- | :--- | :--- |
| `BT` / `ET` | Inicio / fin de bloque de texto | Reset de la matriz |
| `Tm` | Define la matriz de transformación de texto | Posición exacta `(e, f)` |
| `Td` / `TD` | Desplazamiento relativo de línea | Acumular posición |
| `T*` | Nueva línea | `x=0`, `y −= font_size × 1.2` |
| `Tf` | Selecciona fuente y tamaño | Alto del bbox |
| `Tj` | Muestra una cadena | Emite palabras en la posición actual |
| `TJ` | Muestra un array (cadenas + kerning) | Emite y ajusta por kerning |

La función `extract_page_words` recorre `content.operations` manteniendo una
`text_matrix: [f32; 6]`. La posición de cada texto es el componente `(e, f)` de esa
matriz. El **bbox** se computa así:

```rust
let width  = chars * font_size * 0.5;   // ancho ≈ 0.5 em por glifo (Helvetica)
let height = font_size;
bbox = [x, y, x + width, y + height];
```

**¿Por qué 0.5 em por glifo?** Es el ancho promedio de la familia Helvetica (la fuente
más común en facturas) y es suficiente para que el **motor espacial Python** encuentre
anclas y proyecte rayos: no necesita el ancho exacto de cada letra, solo una caja que
contenga la palabra. Resolver métricas de fuente completas (`/Widths` de cada font)
triplicaría la complejidad con beneficio marginal.

**Kerning en `TJ`**: los números dentro del array indican ajuste de espaciado en
milésimas de em; el código los acumula: `cursor_x -= kerning / 1000 * font_size`.

### 6.3 Decodificación de cadenas

Los strings PDF pueden venir en UTF-16BE (con BOM) o bytes crudos. `decode_string`
maneja ambos:

```rust
if data.starts_with(&[0xfe, 0xff]) { /* UTF-16BE → String::from_utf16 */ }
else { String::from_utf8(data.to_vec()) }
```

### 6.4 Hashing para deduplicación

`hash_file` calcula el SHA-256 del archivo **antes** de publicar. Es la "deduplicación
flash" de la US-RUST-001: Python consultará la tabla de hashes y, si ya existe,
marcará la factura como 🔴 duplicada (criterio de US-PY-002). Se calcula aquí porque
ya estamos leyendo el archivo → cero costo adicional de I/O.

### 6.5 Escaneos dentro de PDF

Si un PDF no expone texto vectorial, hoy se produce un payload con `words = []` y
`is_digital = false`. **Rasterizar el PDF a imagen para OCR se dejó como trabajo
futuro** (ver sección 12), porque requeriría renderizar páginas (poppler/PDFium) —
una pieza que no justifica el peso de dependencia en esta US, dado que los escaneos
llegan también como `.png`/`.jpg` directos y esos sí se procesan al 100%.

---

## 7. Pre-procesamiento de Imágenes y OCR: `img_preprocessor.rs`

Para imágenes/escaneos la cadena es: **deskew → Otsu → OCR**:

```
imagen (rotada/borrosa) → detección de ángulo → rotación a 0° → escala de grises
→ binarización Otsu → Tesseract → palabras + bboxes + confianza
```

### 7.1 Deskewing: enderezar la página

Un escaneo rara vez entra perfectamente alineado. Un texto a 15° es ilegible para
OCR. La técnica elegida es **proyección horizontal + barrido de ángulos**:

```rust
fn find_skew_angle(image) -> f32 {
    for angle in (-30.0..=30.0).step_by(0.5) {
        let rotated = rotate(image, angle);
        let score   = horizontal_projection_variance(&rotated);
        if score > best { best = score; best_angle = angle; }
    }
}
```

**Cómo funciona**: para cada candidato de ángulo, se rota la imagen y se suma la
"tinta" (píxeles oscuros) por fila. Cuando el texto está **horizontal**, cada línea de
texto crea un pico nítido en el perfil → **varianza máxima**. Un texto torcido difumina
la tinta entre filas → varianza baja. El ángulo que maximiza la varianza es el de
corrección.

> Barrido de −30° a +30° en pasos de 0.5° = 121 rotaciones de prueba. Cada rotación
> es O(W×H), aceptable para páginas de factura. Es un candidato claro de optimización
> futura (reducir resolución antes del barrido, o buscar primero con paso grueso y
> afinar localmente).

**Signo — el bug que se cazó en desarrollo**: `find_skew_angle` devuelve el ángulo
**que endereza** la página (no el ángulo de inclinación). Inicialmente el código
aplicaba `rotate(gray, -skew_angle)`, lo que *re-torcía* la imagen a 30°. Un test de
integración (imagen rotada a 15° → OCR) lo detectó: la corrección correcta es
`rotate(gray, skew_angle)`. Esto demuestra el valor de los tests con rotación real.

### 7.2 Binarización Otsu

`otsu_binarize` separa texto (oscuro) del fondo (claro) calculando el **umbral que
maximiza la varianza entre clases**:

```rust
for (candidate, count) in histogram.iter().enumerate() {
    weight_background += count;
    ...
    between_variance = w_bg * w_fg * (mean_bg - mean_fg)^2;
    if between_variance >= best_variance { threshold = candidate; }  // ← tie-break clave
}
```

**El tie-break importa (segundo bug real cazado)**: con histogramas escasos (texto
negro sobre fondo blanco, sin niveles intermedios) el perfil de varianza es **plano**
entre los dos clusters. Con `>` (primer máximo) el umbral caía **sobre el nivel de
gris del texto (20)** → el texto se pintaba de blanco → OCR vacío. Usando `>=`
(último máximo) el umbral queda **dentro del hueco** (≈254), el texto (20) queda
negro y el fondo (255) blanco.

### 7.3 OCR con Tesseract

```rust
let result = Command::new("tesseract")
    .arg(&temp_path).arg("stdout").arg("tsv").arg("--psm").arg("3")
    .output();
```

La salida `tsv` se escribe a un PNG temporal (`/tmp/kono_ocr_{uuid}.png`, borrado al
terminar). El parser se queda con las filas **nivel 5** (palabras):

```rust
if columns[0].trim() != "5" { continue; }        // solo palabras
if confidence < 0.0 { continue; }                 // tesseract marca -1 a lo dudoso
// Conversión de coordenadas: origen top-left → bottom-left
let y_pdf = image_height - (top + height);
bbox = [left, y_pdf, left + width, y_pdf + height];
confidence = conf / 100.0;                        // escala a 0.0..=1.0
```

**¿Por qué `--psm 3`?** Es el modo automático de segmentación de página: deja que
Tesseract decida el layout, lo más robusto para facturas con bloques variados.
Alternativas fijas (`--psm 6`) mejoran algunas facturas pero rompen otras.

**Seguridad**: el archivo temporal se genera con `uuid` (nunca con input del usuario)
y se pasa como argumento (sin shell), por lo que no hay riesgo de inyección de
comandos aunque el nombre de archivo sea hostil.

---

## 8. Publicador Redis: `queue_publisher.rs`

### 8.1 API pública

```rust
QueuePublisher::connect(&url)                  // Cliente + ConnectionManager
publisher.publish(&payload) -> entry_id        // XADD con el JSON serializado
publisher.ping()                               // Heartbeat para diagnóstico
```

### 8.2 Publicación atómica

```rust
let json = serde_json::to_string(payload)?;
let entry_id: String = conn
    .xadd(PROCESSING_STREAM, "*", &[("payload", json.as_str())])
    .await?;
```

- Stream: **`invoice_processing_stream`** (constante compartida con Python).
- Campo `payload` → el JSON del contrato.
- `"*"` → Redis genera el ID de entrada (`<ms>-<seq>`), único y ordenable.

### 8.3 Reconexión automática

`ConnectionManager` detecta caídas del servidor y **reestablece la conexión en el
siguiente uso**. Si Redis se reinicia, el daemon no muere: el siguiente ciclo de
escaneo reintenta y los archivos aún no marcados como `processed` se vuelven a publicar.

### 8.4 Canal de fallos controlado

```rust
pub async fn publish_failure(file_path, reason) {
    XADD invoice_processing_stream * payload {"file_path", "status": "CORRUPTED_FILE", "reason"}
}
```

Cuando un archivo no se puede procesar, en vez de silencio se emite un **evento de
error controlado** en el mismo stream. Esto permite que Python o un operador vea *qué*
falló y por qué, y es la base del requisito "sin pánico" de US-RUST-003.

---

## 9. Orquestación del Daemon: `main.rs`

El binario es deliberadamente **delgado**: configura entorno, crea directorios, y
entra en un loop de escaneo.

```rust
loop {
    scan_and_process(&watch_path, &failed_dir, &mut publisher, &mut processed).await?;
    tokio::time::sleep(Duration::from_secs(3)).await;
}
```

### Responsabilidades por ciclo

1. **Leer configuración de entorno** (con defaults seguros):
   - `REDIS_URL` (default `redis://127.0.0.1:6379/0`)
   - `WATCH_DIR` (default `/data/storage/inbound`)
   - `STORAGE_DIR` (default `/data/storage` → `/data/storage/failed`)
2. **Crear directorios** `inbound` y `failed` si no existen (arranque idempotente).
3. **Escanear `inbound`** y clasificar:
   - `is_supported` → solo `pdf, png, jpg, jpeg`.
   - `is_temp` → ignorar `.tmp`, `.part`, `.crdownload` (archivos aún copiándose).
4. **Triage** según extensión → `inspect_and_extract_pdf` o `process_image_and_ocr`.
5. **Publicar** en Redis; si el archivo ya está en el set `processed`, se salta
   (evita duplicar cuando el sistema reinicia).
6. **Fallo controlado**: si el triage falla → `publish_failure` + mover el archivo a
   `/failed/`. El proceso **continúa** con el siguiente archivo.

> El **polling de 3s** es intencional (ver ADR-6): no es competencia de esta US usar
> `notify`; cuando se integre el watcher de US-RUST-001, `scan_and_process` se puede
> reutilizar llamándolo desde los callbacks del watcher.

---

## 10. Flujo de Datos End-to-End

```
                    ┌────────────────────────────────────────────┐
                    │           /data/storage/inbound            │
                    └──────────────┬─────────────────────────────┘
                                   │ (archivo nuevo)
                                   ▼
                    ┌────────────────────────────────────────────┐
                    │         scan_and_process (main.rs)         │
                    │  ext == "pdf" ?  ────────► pdf_triage.rs   │
                    │  ext == png/jpg ? ──────► img_preprocessor.rs
                    └──────────────┬─────────────────────────────┘
                                   │ DocumentPayload (JSON)
                                   ▼
                    ┌────────────────────────────────────────────┐
                    │   queue_publisher::publish()               │
                    │   XADD invoice_processing_stream *         │
                    │       payload <json>                       │
                    └──────────────┬─────────────────────────────┘
                                   │
                    ┌──────────────▼─────────────────────────────┐
                    │   📨 REDIS STREAM (broker)                  │
                    │   → consumido por Python (US-PY-002 worker)│
                    └────────────────────────────────────────────┘

       Flujo de fallo:
       triage falla ──► publish_failure(status=CORRUPTED_FILE)
                     ──► mv archivo → /data/storage/failed/
```

**Ejemplo de payload publicado** (PDF digital):

```json
{
  "document_id": "2f9b1c74-...",
  "file_hash": "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3fdfd0d4a0c9b1f4c2c1b8a2e",
  "file_path": "/data/storage/inbound/factura_001.pdf",
  "is_digital": true,
  "pages_count": 1,
  "words": [
    { "text": "FACTURA", "bbox": [100.5, 720.0, 180.2, 735.0], "page": 1, "confidence": 1.0 },
    { "text": "TOTAL:",  "bbox": [400.0, 150.0, 460.0, 165.0], "page": 1, "confidence": 1.0 }
  ]
}
```

---

## 11. Estrategia de Testing y Verificación

### 11.1 Suite de tests (9 tests, todos verdes)

**Unitarios (`src/img_preprocessor.rs`):**
- `preprocessing_keeps_ink_pixels` — el pipeline Otsu no pierde la tinta del texto
  (caza el bug del tie-break).
- `detects_known_skew_angle` — imagen rotada a 15° → el detector devuelve ≈ −15°.
- `parses_tesseract_tsv_with_coordinate_conversion` — conversión top-left → bottom-left.
- `rejects_negative_confidence_rows` — descarta filas dudosas de Tesseract.

**Integración (`tests/pdf_triage_test.rs`):**
- `extracts_vectorial_text_and_marks_digital` — PDF generado con `lopdf` con texto
  vectorial → `is_digital=true`, palabras correctas, bboxes válidos y dentro de página.
- `pdf_without_text_layer_is_marked_as_scan` — PDF sin texto → `is_digital=false`.

**Integración (`tests/img_preprocessor_test.rs`):**
- `preprocesses_rotated_scan_and_recovers_words` — imagen con texto rotada 15° →
  deskew + OCR recupera palabras.
- `straight_image_also_produces_payload` — imagen recta → payload válido.
- `accepted_extensions_drive_pipeline` — whitelist de extensiones.

### 11.2 ¿Cómo se generan los archivos de prueba sin dependencias externas?

- **PDFs**: se construyen programáticamente con `lopdf` (documento de 1 página con
  operadores `BT/Tf/Td/Tj/ET`). Sin binarios externos, determinista, corre en CI.
- **Imágenes**: se renderizan con la fuente **`font8x8`** (bitmap 8×8 escalado),
  rotadas con el mismo algoritmo de producción. Sin imágenes versionadas en el repo.
- **OCR**: si `tesseract` no está instalado, los tests OCR se **saltan** con aviso
  (CI sin costos ni dependencias ocultas).

### 11.3 Verificación completa (comandos ejecutados en CI/Docker)

```bash
# Desde backend/rust-core dentro de rust:1-slim-bookworm (con tesseract instalado):
cargo check --all-targets     # compila lib + bin + tests
cargo clippy --all-targets -- -D warnings   # cero warnings (calidad de código)
cargo test                    # 9/9 tests en verde
cargo build --release         # build de producción con LTO (usado por el Dockerfile)
```

> Como la máquina de desarrollo no tiene Rust instalado, todo se verificó en
> contenedores `rust:1-slim-bookworm` con volúmenes de caché (`cargo_registry`,
> `kono_target`, `rustup_home`), lo que además replica las condiciones exactas del
> `Dockerfile` de producción.

### 11.4 Revisión de código (skill `code-reviewer`)

Al cierre se aplicó la auto-revisión obligatoria:
- ✅ Sin secretos hardcodeados; configuración solo por variables de entorno.
- ✅ Sin inyección de comandos (Tesseract recibe rutas generadas, sin shell).
- ✅ Sin `unwrap()`/`panic!` en rutas de producción; errores unificados en `KonoError`.
- ✅ Funciones < 200 líneas, complejidad ciclomática baja, nombres descriptivos.
- ✅ Tests deterministas, aislados y sin costos externos (mock/skip de OCR).

---

## 12. Limitaciones Conocidas y Trabajo Futuro

| # | Limitación | Impacto | Mejora propuesta |
| :-- | :--- | :--- | :--- |
| 1 | **Ancho de palabra aproximado** (0.5 em/glyph) | Bboxes ligeramente anchos | Resolver métricas de fuente `/Widths` vía `lopdf` |
| 2 | **PDF escaneado no se rasteriza** | PDFs-imagen generan `words=[]` | Renderizar página a imagen (poppler/PDFium) y derivar a OCR |
| 3 | **Barrido de deskew costoso** (121 rotaciones) | Lento en imágenes grandes | Downsample antes del barrido + afinado local en 2 pasadas |
| 4 | **Benchmark < 5ms no implementado** | Criterio de aceptación pendiente | Añadir `criterion` en `benches/` |
| 5 | **`block` ausente en `Word`** | La US pedía número de bloque | Añadir campo `block` poblado por Tesseract (col 2) |
| 6 | **Polling de 3s en vez de eventos** | Latencia de ingesta | Integrar watcher `notify` de US-RUST-001 reusando `scan_and_process` |
| 7 | **Concurrencia secuencial** | 500 archivos se procesan de a uno | Semáforo + `tokio::spawn` (US-RUST-003, compartida) |
| 8 | **Set `processed` en memoria** | Se reprocesa todo tras reinicio | Persistir hash ya publicado (puede basarse en dedup de US-PY-002) |

**Prioridad sugerida**: (2) rasterización de PDF-imagen y (4) benchmark son los que
cierran criterios de aceptación explícitos de la US; (6) y (7) dependen de la
integración con las US de Dylan (RUST-001/RUST-003).

---

*Documento mantenido con el protocolo de changelog diario del workspace. Toda
modificación debe registrarse en `documentation/changelog/`.*
