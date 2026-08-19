mod config;
mod hasher;
mod models;
mod watcher;

use config::AppConfig;
use std::time::Duration;
use tracing::{error, info, Level};
use tracing_subscriber::FmtSubscriber;
use watcher::FolderWatcherDaemon;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    let config = AppConfig::from_env();
    info!("🦀 [Kono Rust Core] Starting Ingestion & Deduplication Daemon...");
    info!("🦀 [Config] Watch Directory: {:?}", config.watch_dir);
    info!("🦀 [Config] Storage Directory: {:?}", config.storage_dir);
    info!("🦀 [Config] Redis URL: {}", config.redis_url);

    // Connect to Redis asynchronously (optional fallback if offline)
    let redis_conn = match redis::Client::open(config.redis_url.clone()) {
        Ok(client) => match client.get_multiplexed_async_connection().await {
            Ok(conn) => {
                info!("✅ [Redis] Connected successfully to Redis broker.");
                Some(conn)
            }
            Err(e) => {
                error!("⚠️  [Redis] Could not establish connection: {:?}. Running standalone watcher.", e);
                None
            }
        },
        Err(e) => {
            error!("⚠️  [Redis] Invalid URL: {:?}.", e);
            None
        }
    };

    let mut daemon = FolderWatcherDaemon::new(config, redis_conn);
    daemon.run().await?;

    Ok(())
}
