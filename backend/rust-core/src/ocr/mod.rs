pub mod image_ops;
pub mod tesseract_runner;

use std::path::Path;
use tracing::debug;
use uuid::Uuid;

use crate::errors::KonoError;
use crate::types::DocumentPayload;

pub use image_ops::{find_skew_angle, otsu_binarize, preprocess_image, rotate, ProcessedImage};
pub use tesseract_runner::{parse_tsv_words, run_tesseract_on};

/// Fully processes an image: loads it, corrects the skew, binarizes it with
/// Otsu and runs local OCR (Tesseract) producing word-level bounding boxes.
pub fn process_image_and_ocr(path: &Path) -> Result<DocumentPayload, KonoError> {
    let processed = preprocess_image(path)?;
    let words = run_tesseract_on(&processed.binarized)?;
    let file_hash = hash_file(path)?;

    debug!(
        "image triage: skew={:.2}deg words={} path={}",
        processed.skew_angle,
        words.len(),
        path.display()
    );

    Ok(DocumentPayload::new(
        Uuid::new_v4().to_string(),
        file_hash,
        path.to_string_lossy().into_owned(),
        false,
        1,
        words,
    ))
}

pub fn hash_file(path: &Path) -> Result<String, KonoError> {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    let mut file = std::fs::File::open(path)?;
    std::io::copy(&mut file, &mut hasher)?;
    Ok(format!("{:x}", hasher.finalize()))
}
