# US-RUST-002 — Fast PDF Triage, Pre-procesamiento de Imágenes & Publicador Redis
**Tipo:** Story | **SP:** 8 | **Prioridad:** Alta (P0) | **Asignado:** Daniel
**Rama sugerida:** `feature/rust-pdf-triage-img-preprocessor`
**Estado:** ✅ DONE

---

## 📖 Historia de Usuario
> "Como motor de extracción geométrica, quiero inspeccionar cada archivo en milisegundos, extraer palabras y Bounding Boxes de PDFs digitales o aplicar deskewing/OCR a imágenes, y publicar el payload JSON normalizado en Redis Stream, para entregarle a la capa de Python las primitivas geométricas listas para auditoría."

---

## 🎯 Criterios de Aceptación (DoD Específico)
- [x] Con `lopdf` o `pdfium-render`, inspecciona si el PDF contiene capa de texto vectorial ($> 50$ caracteres extraíbles por página).
- [x] En **PDFs Digitales**: extrae en $< 5\text{ ms}$ la lista de palabras junto con sus coordenadas exactas `[x0, y0, x1, y1]`, número de página y bloque.
- [x] En **Escaneos / Imágenes (`.png`, `.jpg`)**:
  - Aplica deskewing (detección de ángulo de inclinación y rotación automática a $0^\circ$).
  - Aplica normalización de contraste y binarización adaptativa Otsu con `image-rs` / OpenCV bindings.
  - Ejecuta OCR posicional local ultraligero (`RapidOCR` / Tesseract C-API) generando palabras con coordenadas y porcentaje de confianza.
- [x] Empaqueta el resultado en un JSON estandarizado:
  ```json
  {
    "document_id": "uuid-v4",
    "file_hash": "sha256...",
    "file_path": "/data/storage/inbound/uuid.pdf",
    "is_digital": true,
    "pages_count": 1,
    "words": [
      { "text": "FACTURA", "bbox": [100.5, 720.0, 180.2, 735.0], "page": 1, "confidence": 1.0 },
      { "text": "TOTAL:", "bbox": [400.0, 150.0, 460.0, 165.0], "page": 1, "confidence": 1.0 }
    ]
  }
  ```
- [x] Publica el trabajo en Redis en el stream `invoice_processing_stream` usando `redis-rs` en $< 1 \text{ ms}$.

---

## 📋 Subtasks Desglosadas por Capa

### 📄 [RUST-PDF] Triage & Extracción Vectorial
- [x] Añadir dependencias en `Cargo.toml` (`lopdf = "0.33"`, `image = "0.25"`, `serde = { version = "1.0", features = ["derive"] }`, `serde_json = "1.0"`).
- [x] Implementar `src/pdf_triage.rs` con función `inspect_and_extract_pdf(path: &Path) -> Result<DocumentPayload, Error>`.
- [x] Extraer palabras iterando operadores `Tj`, `TJ` y matrices de transformación de texto `Tm` para calcular el Bounding Box normalizado en puntos PDF.

### 🖼️ [RUST-VISION] Pre-procesamiento de Imágenes & OCR Local
- [x] Implementar `src/img_preprocessor.rs`:
  - Algoritmo de rotación y deskewing mediante proyección horizontal/vertical de gradientes.
  - Conversión a escala de grises y binarización adaptativa (Otsu Thresholding) para eliminar sombras.
- [x] Integrar motor OCR local con wrapper C-FFI o `rapidocr` para extraer palabras y BBoxes cuando no haya texto vectorial.
- [x] Normalizar las coordenadas de los píxeles de imagen a escala porcentual/PDF estándar.

### 📨 [RUST-QUEUE] Serialización & Publicador Redis
- [x] Implementar `src/queue_publisher.rs` con cliente asíncrono `redis::aio::MultiplexedConnection`.
- [x] Serializar el struct `DocumentPayload` con `serde_json::to_string`.
- [x] Publicar en Redis con comando `XADD invoice_processing_stream * payload <json_string>`.
- [x] Manejar reconexión automática si Redis se reinicia o sufre latencia momentánea.

### 🧪 [TESTS & BENCHMARKING]
- [x] Crear test unitario `tests/pdf_triage_test.rs` con los PDFs de prueba de `scripts/invoices.py`.
- [x] Crear test de visión `tests/img_preprocessor_test.rs` con un ticket rotado a $15^\circ$ verificando que lo enderece a $0^\circ$.
- [x] Verificar tiempos de parsing por página $< 5\text{ ms}$.

