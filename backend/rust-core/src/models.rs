use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InboundDocumentEvent {
    pub document_id: Uuid,
    pub original_file_name: String,
    pub file_path: String,
    pub file_hash_sha256: String,
    pub file_size_bytes: u64,
    pub mime_type: String,
    pub is_duplicate: bool,
    pub timestamp: String,
}
