use serde::{Deserialize, Serialize};

/// Word extracted with its geometric position, normalized in PDF points
/// where the origin (0,0) is the bottom-left corner of the page.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Word {
    pub text: String,
    /// Bounding box `[x0, y0, x1, y1]` in PDF points.
    pub bbox: [f64; 4],
    /// 1-indexed page number.
    pub page: u32,
    /// Confidence in the range 0.0..=1.0 (1.0 for vectorial text).
    pub confidence: f64,
}

/// Normalized payload contract shared between the Rust ingestion core and
/// the Python spatial/validation engine through the Redis Stream.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DocumentPayload {
    pub document_id: String,
    pub file_hash: String,
    pub file_path: String,
    pub is_digital: bool,
    pub pages_count: u32,
    pub words: Vec<Word>,
}

impl DocumentPayload {
    pub fn new(
        document_id: String,
        file_hash: String,
        file_path: String,
        is_digital: bool,
        pages_count: u32,
        words: Vec<Word>,
    ) -> Self {
        Self {
            document_id,
            file_hash,
            file_path,
            is_digital,
            pages_count,
            words,
        }
    }
}
