use std::env;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub watch_dir: PathBuf,
    pub storage_dir: PathBuf,
    pub redis_url: String,
    pub rust_log: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let watch_dir = PathBuf::from(
            env::var("WATCH_DIR").unwrap_or_else(|_| "/data/storage/inbound".to_string()),
        );
        let storage_dir = PathBuf::from(
            env::var("STORAGE_DIR").unwrap_or_else(|_| "/data/storage".to_string()),
        );
        let redis_url = env::var("REDIS_URL")
            .unwrap_or_else(|_| "redis://127.0.0.1:6379/0".to_string());
        let rust_log = env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string());

        Self {
            watch_dir,
            storage_dir,
            redis_url,
            rust_log,
        }
    }
}
