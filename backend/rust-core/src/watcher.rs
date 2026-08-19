use crate::config::AppConfig;
use crate::hasher::compute_sha256;
use crate::models::InboundDocumentEvent;
use chrono::Utc;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use redis::aio::MultiplexedConnection;
use redis::AsyncCommands;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tracing::{error, info, warn};
use uuid::Uuid;

pub struct FolderWatcherDaemon {
    config: AppConfig,
    redis_conn: Option<MultiplexedConnection>,
}

impl FolderWatcherDaemon {
    pub fn new(config: AppConfig, redis_conn: Option<MultiplexedConnection>) -> Self {
        Self { config, redis_conn }
    }

    pub async fn run(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Ensure directories exist
        fs::create_dir_all(&self.config.watch_dir)?;
        let processed_dir = self.config.storage_dir.join("processed");
        fs::create_dir_all(&processed_dir)?;

        info!(
            "🦀 [Watcher] Monitoring inbound directory: {:?}",
            self.config.watch_dir
        );

        let (tx, mut rx) = mpsc::channel::<PathBuf>(100);

        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    match event.kind {
                        EventKind::Create(_) | EventKind::Modify(_) | EventKind::Access(_) => {
                            for path in event.paths {
                                if is_supported_document(&path) {
                                    let _ = tx.blocking_send(path);
                                }
                            }
                        }
                        _ => {}
                    }
                }
            },
            Config::default().with_poll_interval(Duration::from_millis(200)),
        )?;

        watcher.watch(&self.config.watch_dir, RecursiveMode::NonRecursive)?;

        while let Some(path) = rx.recv().await {
            if path.exists() && path.is_file() {
                // Wait briefly for file write lock to release
                tokio::time::sleep(Duration::from_millis(150)).await;
                if let Err(e) = self.process_file(&path, &processed_dir).await {
                    error!("❌ [Watcher] Error processing file {:?}: {:?}", path, e);
                }
            }
        }

        Ok(())
    }

    async fn process_file(
        &mut self,
        source_path: &Path,
        processed_dir: &Path,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let file_name = source_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let metadata = fs::metadata(source_path)?;
        let file_size = metadata.len();
        if file_size == 0 {
            return Ok(()); // Ignore empty temporary files
        }

        // 1. Instant SHA-256 Hashing (< 1 ms)
        let hash = compute_sha256(source_path)?;
        let doc_id = Uuid::new_v4();
        let extension = source_path
            .extension()
            .unwrap_or_default()
            .to_string_lossy();
        let mime_type = match extension.to_lowercase().as_str() {
            "pdf" => "application/pdf",
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            _ => "application/octet-stream",
        }
        .to_string();

        // 2. Persist to storage with UUID
        let target_filename = format!("{}.{}", doc_id, extension);
        let target_path = processed_dir.join(&target_filename);
        fs::copy(source_path, &target_path)?;
        let _ = fs::remove_file(source_path); // Clean inbound folder

        info!(
            "⚡ [Watcher] Document detected: '{}' | Hash: {} | Size: {} bytes",
            file_name, hash, file_size
        );

        // 3. Deduplication check against Redis Set
        let mut is_duplicate = false;
        if let Some(ref mut conn) = self.redis_conn {
            let exists: bool = conn.sismember("kono:document_hashes", &hash).await.unwrap_or(false);
            if exists {
                is_duplicate = true;
                warn!(
                    "🚨 [Deduplicator] DUPLICATE DETECTED for hash: {} ('{}')",
                    hash, file_name
                );
            } else {
                let _: () = conn.sadd("kono:document_hashes", &hash).await.unwrap_or(());
            }

            // 4. Publish Event to Redis Stream
            let event = InboundDocumentEvent {
                document_id: doc_id,
                original_file_name: file_name,
                file_path: target_path.to_string_lossy().to_string(),
                file_hash_sha256: hash,
                file_size_bytes: file_size,
                mime_type,
                is_duplicate,
                timestamp: Utc::now().to_rfc3339(),
            };

            let payload_json = serde_json::to_string(&event)?;
            let _: () = conn
                .xadd(
                    "invoice_inbound_stream",
                    "*",
                    &[("payload", &payload_json)],
                )
                .await
                .unwrap_or(());

            info!(
                "📨 [Redis] Published inbound event for doc_id: {} (duplicate: {})",
                doc_id, is_duplicate
            );
        }

        Ok(())
    }
}

fn is_supported_document(path: &Path) -> bool {
    if let Some(ext) = path.extension() {
        let ext_str = ext.to_string_lossy().to_lowercase();
        matches!(ext_str.as_str(), "pdf" | "png" | "jpg" | "jpeg")
    } else {
        false
    }
}
