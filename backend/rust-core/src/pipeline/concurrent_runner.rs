use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tracing::{error, info, warn};
use uuid::Uuid;
use redis::aio::MultiplexedConnection;
use redis::AsyncCommands;

use crate::config::AppConfig;
use crate::pipeline::safe_io::{move_to_failed_dir, safe_read_file};

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

pub struct ConcurrentIngestionPipeline {
    _config: AppConfig,
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
            _config: config,
            pipeline_config,
            semaphore: Arc::new(Semaphore::new(max_tasks)),
            redis_conn,
        }
    }

    pub async fn process_concurrent(
        &self,
        source_path: PathBuf,
        processed_dir: PathBuf,
        failed_dir: PathBuf,
    ) {
        let permit = match self.semaphore.clone().acquire_owned().await {
            Ok(p) => p,
            Err(_) => return,
        };

        let max_retries = self.pipeline_config.max_retry_attempts;
        let initial_backoff = self.pipeline_config.initial_backoff_ms;
        let mut redis_conn = self.redis_conn.clone();

        tokio::spawn(async move {
            let _permit = permit;
            let file_name = source_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

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

            let target_filename = format!("{}.{}", doc_id, extension);
            let target_path = processed_dir.join(&target_filename);

            if let Err(err) = fs::write(&target_path, &file_bytes) {
                error!("❌ [Pipeline] Failed writing to {:?}: {}", target_path, err);
                let _ = move_to_failed_dir(&source_path, &failed_dir);
                return;
            }
            let _ = fs::remove_file(&source_path);

            info!(
                "⚡ [Pipeline] Ingested: '{}' (ID: {}) | Hash: {} | Size: {} bytes",
                file_name, doc_id, hash, file_size
            );

            if let Some(ref mut conn) = redis_conn {
                let exists: bool = conn
                    .sismember("kono:document_hashes", &hash)
                    .await
                    .unwrap_or(false);

                if exists {
                    warn!(
                        "🚨 [Deduplicator] DUPLICATE DETECTED for hash: {} ('{}')",
                        hash, file_name
                    );
                } else {
                    let _: () = conn.sadd("kono:document_hashes", &hash).await.unwrap_or(());
                }

                let triage_res = match extension.to_lowercase().as_str() {
                    "pdf" => crate::triage::inspect_and_extract_pdf(&target_path),
                    "png" | "jpg" | "jpeg" => crate::ocr::process_image_and_ocr(&target_path),
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
