use std::fs::{self, File};
use std::io::{self, Read};
use std::path::Path;
use std::time::Duration;
use tracing::warn;

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
                backoff *= 3;
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
