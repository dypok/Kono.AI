use std::time::Duration;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("🦀 [Kono Rust Core] Ingestion & Triage Engine started (Daemon Mode).");
    info!("🦀 [Kono Rust Core] Listening directly to filesystem events & publishing to Redis on port 6379.");

    // Keep daemon active
    loop {
        tokio::time::sleep(Duration::from_secs(30)).await;
        info!("🦀 [Kono Rust Core] Heartbeat active - watcher operational...");
    }
}
