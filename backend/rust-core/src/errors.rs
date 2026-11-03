use thiserror::Error;

/// Unified error type for the Rust ingestion core.
///
/// Every fallible operation returns `Result<T, KonoError>`; no `unwrap()`
/// is allowed in production paths so that a single corrupt file can never
/// take down the daemon.
#[derive(Debug, Error)]
pub enum KonoError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("pdf parsing error: {0}")]
    Pdf(#[from] lopdf::Error),

    #[error("image decoding error: {0}")]
    Image(#[from] image::ImageError),

    #[error("redis error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("tesseract OCR error: {0}")]
    Tesseract(String),

    #[error("unsupported file type: {0}")]
    UnsupportedFile(String),

    #[error("empty or unreadable document: {0}")]
    EmptyDocument(String),

    #[error("configuration error: {0}")]
    Config(String),
}

impl From<String> for KonoError {
    fn from(msg: String) -> Self {
        KonoError::Config(msg)
    }
}
