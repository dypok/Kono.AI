use std::fs::{self, File};
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Semaphore;
use tracing::{error, info, warn};

use crate::config::AppConfig;
use crate::hasher::compute_sha256;
use crate::models::InboundDocumentEvent;
use chrono::Utc;
use redis::aio::MultiplexedConnection;
use redis::AsyncCommands;
use uuid::Uuid;

/// Configuration for concurrency and retry backoff.
#[derive(Debug, Clone)]
pub struct PipelineConfig {
    pub max_concurrent_tasks: usize,
    pub max_retry_attempts: u32,
    pub initial_backoff_ms: u64,
}

impl Default for PipelineConfig {
    fn default() -> Self {
        let cpus = num_cpus::get();
        Self {
            max_concurrent_tasks: (cpus * 2).max(4),
            max_retry_attempts: 3,
            initial_backoff_ms: 100,
        }
    }
}

/// Safely attempts to read a file with exponential backoff if the OS locks it during copy.
pub async fn safe_read_file(
    path: &Path,
    max_attempts: u32,
    initial_backoff_ms: u64,
) -> io::Result<(Vec<u8>, u64)> {
    let mut attempt = 0;
    let mut backoff = initial_backoff_ms;

    loop {
        attempt += 1;
        match File::open(path) {
            Ok(mut file) => {
                let metadata = file.metadata()?;
                let file_size = metadata.len();
                if file_size > 0 {
                    let mut buffer = Vec::with_capacity(file_size as usize);
                    file.read_to_end(&mut buffer)?;
                    return Ok((buffer, file_size));
                }
            }
            Err(err) if attempt < max_attempts => {
                warn!(
                    "⏳ [Pipeline] File {:?} locked or unreadable (attempt {}/{}): {}. Retrying in {}ms...",
                    path, attempt, max_attempts, err, backoff
                );
                tokio::time::sleep(Duration::from_millis(backoff)).await;
                backoff *= 3; // Exponential backoff: 100ms -> 300ms -> 900ms
            }
            Err(err) => return Err(err),
        }

        if attempt >= max_attempts {
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                format!("Failed to read file {:?} after {} attempts", path, max_attempts),
            ));
        }

        tokio::time::sleep(Duration::from_millis(backoff)).await;
        backoff *= 3;
    }
}

/// Dispatches inbound documents through the bounded concurrent pipeline.
pub struct ConcurrentIngestionPipeline {
    config: AppConfig,
    pipeline_config: PipelineConfig,
    semaphore: Arc<Semaphore>,
    redis_conn: Option<MultiplexedConnection>,
}

impl ConcurrentIngestionPipeline {
    pub fn new(
        config: AppConfig,
        pipeline_config: PipelineConfig,
        redis_conn: Option<MultiplexedConnection>,
    ) -> Self {
        let max_tasks = pipeline_config.max_concurrent_tasks;
        info!(
            "⚡ [Pipeline] Initialized Concurrent Ingestion Pipeline (Max concurrency: {} tasks)",
            max_tasks
        );
        Self {
            config,
            pipeline_config,
            semaphore: Arc::new(Semaphore::new(max_tasks)),
            redis_conn,
        }
    }

    /// Processes a single file using a semaphore permit and task spawn.
    pub async fn process_concurrent(
        &self,
        source_path: PathBuf,
        processed_dir: PathBuf,
        failed_dir: PathBuf,
    ) {
        let permit = match self.semaphore.clone().acquire_owned().await {
            Ok(p) => p,
            Err(_) => return, // Closed semaphore during shutdown
        };

        let max_retries = self.pipeline_config.max_retry_attempts;
        let initial_backoff = self.pipeline_config.initial_backoff_ms;
        let mut redis_conn = self.redis_conn.clone();

        tokio::spawn(async move {
            let _permit = permit; // Permit drops when task completes
            let file_name = source_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            // 1. Safe read with exponential backoff
            let (file_bytes, file_size) = match safe_read_file(
                &source_path,
                max_retries,
                initial_backoff,
            )
            .await
            {
                Ok(res) => res,
                Err(err) => {
                    error!(
                        "❌ [Pipeline] Unrecoverable read error for {:?}: {}. Moving to /failed/",
                        source_path, err
                    );
                    let _ = move_to_failed_dir(&source_path, &failed_dir);
                    if let Some(ref mut conn) = redis_conn {
                        let _: () = conn
                            .xadd(
                                "kono_alerts_stream",
                                "*",
                                &[
                                    ("status", "READ_ERROR"),
                                    ("file_name", &file_name),
                                    ("error", &err.to_string()),
                                ],
                            )
                            .await
                            .unwrap_or(());
                    }
                    return;
                }
            };

            // 2. Instant SHA-256 Hashing from bytes
            let hash = {
                use sha2::{Digest, Sha256};
                let mut hasher = Sha256::new();
                hasher.update(&file_bytes);
                format!("{:x}", hasher.finalize())
            };

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

            // 3. Move to processed storage
            let target_filename = format!("{}.{}", doc_id, extension);
            let target_path = processed_dir.join(&target_filename);

            if let Err(err) = fs::write(&target_path, &file_bytes) {
                error!("❌ [Pipeline] Failed writing to {:?}: {}", target_path, err);
                let _ = move_to_failed_dir(&source_path, &failed_dir);
                return;
            }
            let _ = fs::remove_file(&source_path);

            info!(
                "⚡ [Pipeline] Successfully ingested: '{}' (ID: {}) | Hash: {} | Size: {} bytes",
                file_name, doc_id, hash, file_size
            );

            // 4. Deduplication & Redis Stream Publication
            let mut is_duplicate = false;
            if let Some(ref mut conn) = redis_conn {
                let exists: bool = conn
                    .sismember("kono:document_hashes", &hash)
                    .await
                    .unwrap_or(false);

                if exists {
                    is_duplicate = true;
                    warn!(
                        "🚨 [Deduplicator] DUPLICATE DETECTED for hash: {} ('{}')",
                        hash, file_name
                    );
                } else {
                    let _: () = conn.sadd("kono:document_hashes", &hash).await.unwrap_or(());
                }

                // 5. Triage Execution (Vectorial extraction via lopdf or OCR)
                let triage_res = match extension.to_lowercase().as_str() {
                    "pdf" => crate::pdf_triage::inspect_and_extract_pdf(&target_path),
                    "png" | "jpg" | "jpeg" => crate::img_preprocessor::process_image_and_ocr(&target_path),
                    _ => Ok(crate::types::DocumentPayload::new(
                        doc_id.to_string(),
                        hash.clone(),
                        target_path.to_string_lossy().into_owned(),
                        false,
                        1,
                        Vec::new(),
                    )),
                };

                match triage_res {
                    Ok(payload) => {
                        info!(
                            "🦀 [Rust Triage] Document {} ({}): {} words extracted with geometric BBoxes",
                            file_name, doc_id, payload.words.len()
                        );
                        if let Ok(payload_json) = serde_json::to_string(&payload) {
                            let _: () = conn
                                .xadd(
                                    "invoice_processing_stream",
                                    "*",
                                    &[("payload", &payload_json)],
                                )
                                .await
                                .unwrap_or(());
                        }
                    }
                    Err(err) => {
                        warn!(
                            "⚠️ [Rust Triage] Triage extraction warning for {}: {}",
                            file_name, err
                        );
                    }
                }
            }
        });
    }
}

/// Moves corrupted or unreadable files safely to the dead-letter /failed/ folder.
pub fn move_to_failed_dir(source: &Path, failed_dir: &Path) -> io::Result<()> {
    fs::create_dir_all(failed_dir)?;
    let destination = failed_dir.join(source.file_name().unwrap_or_default());
    if source.exists() {
        fs::rename(source, &destination)?;
        warn!("⚠️  [Dead-Letter] Moved failed file to {:?}", destination);
    }
    Ok(())
}
