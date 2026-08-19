use redis::aio::ConnectionManager;
use redis::{AsyncCommands, Client};
use serde::Serialize;
use tracing::{debug, warn};

use crate::errors::KonoError;

/// Redis Stream consumed by the Python worker (`invoice_processing_stream`).
pub const PROCESSING_STREAM: &str = "invoice_processing_stream";

/// Publishes normalized payloads to the Redis Stream with automatic
/// reconnection handled by `ConnectionManager`.
#[derive(Clone)]
pub struct QueuePublisher {
    conn: ConnectionManager,
}

impl QueuePublisher {
    /// Establishes the Redis connection and returns a publisher ready to use.
    pub async fn connect(redis_url: &str) -> Result<Self, KonoError> {
        let client = Client::open(redis_url)?;
        let conn = ConnectionManager::new(client).await?;
        Ok(Self { conn })
    }

    /// Serializes and appends the payload to the processing stream.
    /// Returns the generated stream entry id.
    pub async fn publish<T: Serialize>(&mut self, payload: &T) -> Result<String, KonoError> {
        let json = serde_json::to_string(payload)?;
        let entry_id: String = self
            .conn
            .xadd(PROCESSING_STREAM, "*", &[("payload", json.as_str())])
            .await?;

        debug!("published entry {} to stream {}", entry_id, PROCESSING_STREAM);
        Ok(entry_id)
    }

    /// Explicit ping used by the heartbeat to surface connectivity problems.
    pub async fn ping(&mut self) -> Result<(), KonoError> {
        redis::cmd("PING")
            .query_async::<_, String>(&mut self.conn)
            .await
            .map(|_| ())
            .map_err(Into::into)
    }
}

impl std::fmt::Debug for QueuePublisher {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("QueuePublisher")
    }
}

/// Registers a controlled failure for the given file (used when a document
/// cannot be triaged) so that upstream can route it to the failed folder.
pub async fn publish_failure(file_path: &str, reason: &str) -> Result<(), KonoError> {
    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://127.0.0.1:6379/0".into());
    let mut publisher = QueuePublisher::connect(&redis_url).await?;
    let json = serde_json::json!({
        "file_path": file_path,
        "status": "CORRUPTED_FILE",
        "reason": reason,
    });
    let _: String = publisher
        .conn
        .xadd(PROCESSING_STREAM, "*", &[("payload", json.to_string().as_str())])
        .await?;
    warn!("registered failure for {}", file_path);
    Ok(())
}
