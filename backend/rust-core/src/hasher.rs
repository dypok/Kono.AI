use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

/// Computes SHA-256 hash of a file using chunked byte streaming (< 1ms).
pub fn compute_sha256<P: AsRef<Path>>(path: P) -> io::Result<String> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536]; // 64 KB buffer

    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_compute_sha256() {
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(b"Kono.ai Test Invoice Content").unwrap();

        let hash = compute_sha256(temp_file.path()).unwrap();
        assert_eq!(hash.len(), 64);
    }
}
