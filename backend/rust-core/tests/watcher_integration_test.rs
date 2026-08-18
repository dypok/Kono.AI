use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use std::time::Duration;
use tempfile::tempdir;

#[path = "../src/config.rs"]
mod config;
#[path = "../src/hasher.rs"]
mod hasher;
#[path = "../src/models.rs"]
mod models;
#[path = "../src/watcher.rs"]
mod watcher;

use config::AppConfig;
use watcher::FolderWatcherDaemon;

#[tokio::test]
async fn test_folder_watcher_detects_and_hashes_inbound_invoices() {
    let base_dir = tempdir().unwrap();
    let inbound_dir = base_dir.path().join("inbound");
    let storage_dir = base_dir.path().join("storage");
    fs::create_dir_all(&inbound_dir).unwrap();
    fs::create_dir_all(&storage_dir).unwrap();

    let config = AppConfig {
        watch_dir: inbound_dir.clone(),
        storage_dir: storage_dir.clone(),
        redis_url: "redis://127.0.0.1:6379/0".to_string(),
        rust_log: "info".to_string(),
    };

    // Instantiate daemon without Redis (standalone mode)
    let mut daemon = FolderWatcherDaemon::new(config, None);

    // Spawn watcher in background task
    let handle = tokio::spawn(async move {
        let _ = daemon.run().await;
    });

    // Allow watcher initialization
    tokio::time::sleep(Duration::from_millis(300)).await;

    // Simulate 3 invoices arriving simultaneously
    for i in 1..=3 {
        let invoice_path = inbound_dir.join(format!("factura_test_{}.pdf", i));
        let mut file = File::create(&invoice_path).unwrap();
        writeln!(file, "%PDF-1.4 Test Invoice Content {}", i).unwrap();
    }

    // Wait for event loop processing
    tokio::time::sleep(Duration::from_millis(600)).await;

    // Verify inbound directory was cleaned and moved to processed storage
    let processed_dir = storage_dir.join("processed");
    let processed_files: Vec<_> = fs::read_dir(&processed_dir)
        .unwrap()
        .map(|r| r.unwrap().path())
        .collect();

    assert_eq!(processed_files.len(), 3);
    for file in processed_files {
        assert_eq!(file.extension().unwrap(), "pdf");
        let hash = hasher::compute_sha256(&file).unwrap();
        assert_eq!(hash.len(), 64);
    }

    handle.abort();
}
