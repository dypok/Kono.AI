use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tempfile::tempdir;

use kono_rust_core::config::AppConfig;
use kono_rust_core::pipeline::{safe_read_file, ConcurrentIngestionPipeline, PipelineConfig};

#[tokio::test]
async fn test_safe_read_with_exponential_backoff() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("retry_invoice.pdf");

    // Write file content
    {
        let mut file = File::create(&file_path).unwrap();
        file.write_all(b"%PDF-1.4 Reliable Ingestion Test").unwrap();
    }

    // safe_read_file should succeed immediately on normal readable file
    let (bytes, size) = safe_read_file(&file_path, 3, 50).await.unwrap();
    assert_eq!(size, 32);
    assert_eq!(&bytes[..8], b"%PDF-1.4");
}

#[tokio::test]
async fn test_concurrency_pipeline_handles_burst_without_emfile() {
    let base_dir = tempdir().unwrap();
    let inbound_dir = base_dir.path().join("inbound");
    let storage_dir = base_dir.path().join("storage");
    let processed_dir = storage_dir.join("processed");
    let failed_dir = storage_dir.join("failed");

    fs::create_dir_all(&inbound_dir).unwrap();
    fs::create_dir_all(&processed_dir).unwrap();
    fs::create_dir_all(&failed_dir).unwrap();

    let config = AppConfig {
        watch_dir: inbound_dir.clone(),
        storage_dir: storage_dir.clone(),
        redis_url: "redis://127.0.0.1:6379/0".to_string(),
        rust_log: "info".to_string(),
    };

    let pipeline_config = PipelineConfig {
        max_concurrent_tasks: 8,
        max_retry_attempts: 2,
        initial_backoff_ms: 20,
    };

    let pipeline = Arc::new(ConcurrentIngestionPipeline::new(config, pipeline_config, None));

    // Simulate concurrent burst of 50 files
    let mut tasks = Vec::new();
    for i in 0..50 {
        let file_path = inbound_dir.join(format!("burst_invoice_{:03}.pdf", i));
        let mut file = File::create(&file_path).unwrap();
        writeln!(file, "%PDF-1.4 Invoice Content Burst Batch #{}", i).unwrap();

        let pipe = pipeline.clone();
        let proc_dir = processed_dir.clone();
        let fail_dir = failed_dir.clone();

        tasks.push(tokio::spawn(async move {
            pipe.process_concurrent(file_path, proc_dir, fail_dir).await;
        }));
    }

    // Await task spawns
    for task in tasks {
        let _ = task.await;
    }

    // Allow background permits to finish execution
    tokio::time::sleep(Duration::from_millis(800)).await;

    // Verify all 50 files were processed to storage
    let processed_count = fs::read_dir(&processed_dir).unwrap().count();
    assert_eq!(
        processed_count, 50,
        "All 50 burst files should be processed into storage"
    );
}

#[tokio::test]
async fn test_corrupt_files_route_to_failed_directory() {
    let base_dir = tempdir().unwrap();
    let failed_dir = base_dir.path().join("failed");
    fs::create_dir_all(&failed_dir).unwrap();

    let corrupt_file = base_dir.path().join("corrupt_doc.pdf");
    {
        let mut f = File::create(&corrupt_file).unwrap();
        f.write_all(b"CORRUPTED_BINARY_NOT_VALID_PDF").unwrap();
    }

    kono_rust_core::pipeline::move_to_failed_dir(&corrupt_file, &failed_dir).unwrap();

    assert!(!corrupt_file.exists());
    assert!(failed_dir.join("corrupt_doc.pdf").exists());
}
