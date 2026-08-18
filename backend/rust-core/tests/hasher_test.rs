use std::fs::File;
use std::io::Write;
use tempfile::tempdir;

#[path = "../src/hasher.rs"]
mod hasher;

#[test]
fn test_fast_sha256_hashing() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test_invoice.pdf");
    
    let mut file = File::create(&file_path).unwrap();
    file.write_all(b"%PDF-1.4 Kono.ai Synthetic Invoice Testing Content").unwrap();
    
    let hash = hasher::compute_sha256(&file_path).unwrap();
    assert_eq!(hash.len(), 64);
    assert_eq!(
        hash,
        "89115be11b2390a7aaef880620f4c3bf4d30c5e317079ddffea118c7c94b79b6"
    );
}
