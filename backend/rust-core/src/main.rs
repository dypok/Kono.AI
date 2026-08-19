mod config;
mod hasher;
mod models;
mod watcher;

use std::path::{Path, PathBuf};
use std::time::Duration;

use config::AppConfig;
use kono_rust_core::errors::KonoError;
use kono_rust_core::img_preprocessor::process_image_and_ocr;
use kono_rust_core::pdf_triage::inspect_and_extract_pdf;
use kono_rust_core::queue_publisher::{publish_failure, QueuePublisher};
use kono_rust_core::types::DocumentPayload;
use tracing::{error, info, warn, Level};
use tracing_subscriber::FmtSubscriber;
use watcher::FolderWatcherDaemon;

/// Polling interval between inbound directory scans (US-RUST-002 triage).
/// The event-driven watcher (US-RUST-001) detects and moves files; this poll
/// runs the geometric triage on whatever remains in the inbound directory.
const SCAN_INTERVAL_SECS: u64 = 3;

/// Extensions accepted by the triage pipeline.
const SUPPORTED_EXTENSIONS: &[&str] = &["pdf", "png", "jpg", "jpeg"];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    init_tracing();

    let config = AppConfig::from_env();
    info!("🦀 [Kono Rust Core] Starting Ingestion & Triage Daemon...");
    info!("🦀 [Config] Watch Directory: {:?}", config.watch_dir);
    info!("🦀 [Config] Storage Directory: {:?}", config.storage_dir);
    info!("🦀 [Config] Redis URL: {}", config.redis_url);

    // US-RUST-001 (Dylan): event-driven folder watcher with SHA-256
    // deduplication. Runs concurrently; publishes inbound events to the
    // `invoice_inbound_stream` and moves detected files to `processed/`.
    let redis_url_for_watcher = config.redis_url.clone();
    let mut daemon = FolderWatcherDaemon::new(config.clone(), None);
    let _watcher_task = tokio::spawn(async move {
        // Establish a dedicated Redis connection for the deduplicator watcher
        // (US-RUST-001). Falls back to standalone mode if Redis is unavailable.
        let redis_conn = match redis::Client::open(redis_url_for_watcher.clone()) {
            Ok(client) => match client.get_multiplexed_async_connection().await {
                Ok(conn) => {
                    info!("[Redis] US-RUST-001 connected to Redis broker.");
                    Some(conn)
                }
                Err(e) => {
                    error!("[Redis] US-RUST-001 could not connect: {e:?}. Running standalone watcher.");
                    None
                }
            },
            Err(e) => {
                error!("[Redis] US-RUST-001 invalid URL: {e:?}.");
                None
            }
        };
        daemon.set_redis_connection(redis_conn);
        if let Err(e) = daemon.run().await {
            error!("[Watcher] daemon stopped: {e:?}");
        }
    });

    // US-RUST-002 (Daniel): geometric triage polling over the inbound dir.
    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://127.0.0.1:6379/0".into());
    let watch_path = config.watch_dir.clone();
    let failed_dir = config.storage_dir.join("failed");
    std::fs::create_dir_all(&watch_path)?;
    std::fs::create_dir_all(&failed_dir)?;

    let mut publisher = QueuePublisher::connect(&redis_url).await?;
    let mut processed: std::collections::HashSet<PathBuf> = std::collections::HashSet::new();

    loop {
        match scan_and_process(&watch_path, &failed_dir, &mut publisher, &mut processed).await {
            Ok(()) => {}
            Err(err) => error!("triage cycle failed: {err}"),
        }
        tokio::time::sleep(Duration::from_secs(SCAN_INTERVAL_SECS)).await;
    }
}

fn init_tracing() {
    let subscriber = FmtSubscriber::builder().with_max_level(Level::INFO).finish();
    let _ = tracing::subscriber::set_global_default(subscriber);
}

/// Scans the inbound directory for new supported files and processes them.
async fn scan_and_process(
    watch_dir: &Path,
    failed_dir: &Path,
    publisher: &mut QueuePublisher,
    processed: &mut std::collections::HashSet<PathBuf>,
) -> Result<(), KonoError> {
    let entries = match std::fs::read_dir(watch_dir) {
        Ok(entries) => entries,
        Err(err) => return Err(KonoError::Io(err)),
    };

    let mut files: Vec<PathBuf> = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() && is_supported(&path) && !is_temp(&path) {
            files.push(path);
        }
    }
    files.sort();

    for path in files {
        if processed.contains(&path) {
            continue;
        }
        match triage_file(&path).await {
            Ok(payload) => {
                match publisher.publish(&payload).await {
                    Ok(entry_id) => {
                        info!(
                            "triage ok: {} -> stream entry {} ({} words)",
                            path.display(),
                            entry_id,
                            payload.words.len()
                        );
                        processed.insert(path.clone());
                    }
                    Err(err) => error!("failed to publish {}: {err}", path.display()),
                }
            }
            Err(err) => {
                error!("triage failed for {}: {err}", path.display());
                let _ = publish_failure(&path.to_string_lossy(), &err.to_string()).await;
                let _ = move_to_failed(&path, failed_dir);
            }
        }
    }

    Ok(())
}

/// Runs the document triage: PDF vectorial extraction or image OCR.
async fn triage_file(path: &Path) -> Result<DocumentPayload, KonoError> {
    let ext = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "pdf" => inspect_and_extract_pdf(path),
        "png" | "jpg" | "jpeg" => process_image_and_ocr(path),
        other => Err(KonoError::UnsupportedFile(other.to_string())),
    }
}

fn is_supported(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// Skips files that are still being copied to disk (e.g. `.part`, `.tmp`).
fn is_temp(path: &Path) -> bool {
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_lowercase();
    name.ends_with(".tmp") || name.ends_with(".part") || name.ends_with(".crdownload")
}

/// Moves an unprocessable file to the failed folder so the pipeline never
/// stops on a corrupt or password-protected document.
fn move_to_failed(path: &Path, failed_dir: &Path) -> std::io::Result<()> {
    let destination = failed_dir.join(path.file_name().unwrap_or_default());
    if destination.exists() {
        warn!("{} already in failed folder, skipping move", destination.display());
        return Ok(());
    }
    std::fs::rename(path, &destination)?;
    warn!("moved corrupt file to {}", destination.display());
    Ok(())
}
