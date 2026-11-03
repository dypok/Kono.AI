use crate::config::AppConfig;
use crate::pipeline::{ConcurrentIngestionPipeline, PipelineConfig};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use redis::aio::MultiplexedConnection;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tracing::info;

pub struct FolderWatcherDaemon {
    config: AppConfig,
    redis_conn: Option<MultiplexedConnection>,
    pipeline: Option<Arc<ConcurrentIngestionPipeline>>,
}

impl FolderWatcherDaemon {
    pub fn new(config: AppConfig, redis_conn: Option<MultiplexedConnection>) -> Self {
        let pipeline = Some(Arc::new(ConcurrentIngestionPipeline::new(
            config.clone(),
            PipelineConfig::default(),
            redis_conn.clone(),
        )));
        Self {
            config,
            redis_conn,
            pipeline,
        }
    }

    /// Injects a Redis connection after construction so callers can connect
    /// lazily once the async runtime is available.
    pub fn set_redis_connection(&mut self, conn: Option<MultiplexedConnection>) {
        self.redis_conn = conn.clone();
        self.pipeline = Some(Arc::new(ConcurrentIngestionPipeline::new(
            self.config.clone(),
            PipelineConfig::default(),
            conn,
        )));
    }

    pub async fn run(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        fs::create_dir_all(&self.config.watch_dir)?;
        let processed_dir = self.config.storage_dir.join("processed");
        let failed_dir = self.config.storage_dir.join("failed");
        fs::create_dir_all(&processed_dir)?;
        fs::create_dir_all(&failed_dir)?;

        info!(
            "🦀 [Watcher] Monitoring inbound directory: {:?}",
            self.config.watch_dir
        );

        let (tx, mut rx) = mpsc::channel::<PathBuf>(500);

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
            Config::default().with_poll_interval(Duration::from_millis(150)),
        )?;

        watcher.watch(&self.config.watch_dir, RecursiveMode::NonRecursive)?;

        let pipeline = self
            .pipeline
            .clone()
            .unwrap_or_else(|| {
                Arc::new(ConcurrentIngestionPipeline::new(
                    self.config.clone(),
                    PipelineConfig::default(),
                    self.redis_conn.clone(),
                ))
            });

        while let Some(path) = rx.recv().await {
            if path.exists() && path.is_file() {
                // Dispatch concurrently to bounded pipeline
                pipeline
                    .process_concurrent(path, processed_dir.clone(), failed_dir.clone())
                    .await;
            }
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
