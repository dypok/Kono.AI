use std::path::{Path, PathBuf};
use std::process::Command;

use image::{GrayImage, ImageBuffer, Luma};
use sha2::{Digest, Sha256};
use tracing::{debug, warn};
use uuid::Uuid;

use crate::errors::KonoError;
use crate::types::{DocumentPayload, Word};

/// Result of the image preprocessing stage, ready to be fed to OCR.
struct ProcessedImage {
    binarized: GrayImage,
    skew_angle: f32,
}

/// Deskew angle search range, half-open `-15..=15` degrees in 0.5 steps.
const SKEW_MIN_DEG: i32 = -30;
const SKEW_MAX_DEG: i32 = 30;
const SKEW_STEP: f32 = 0.5;

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

/// Loads an image, detects and corrects skew, converts to grayscale and
/// applies adaptive Otsu binarization to remove shadows and contrast noise.
fn preprocess_image(path: &Path) -> Result<ProcessedImage, KonoError> {
    let image = image::open(path)?;
    let gray = image.to_luma8();

    // `find_skew_angle` returns the angle that straightens the page, so we
    // rotate by that exact value (not its negation) to correct the skew.
    let skew_angle = find_skew_angle(&gray);
    let rotated = if skew_angle.abs() > 0.05 {
        rotate(&gray, skew_angle)
    } else {
        gray
    };

    let binarized = otsu_binarize(&rotated);

    Ok(ProcessedImage {
        binarized,
        skew_angle,
    })
}

/// Detects the document skew by sweeping candidate angles and keeping the one
/// that maximizes the variance of the horizontal projection profile.
fn find_skew_angle(image: &GrayImage) -> f32 {
    let mut best_angle: f32 = 0.0;
    let mut best_score: f64 = f64::MIN;

    let mut step = SKEW_MIN_DEG as f32;
    while step <= SKEW_MAX_DEG as f32 {
        let rotated = rotate(image, step);
        let score = horizontal_projection_variance(&rotated);
        if score > best_score {
            best_score = score;
            best_angle = step;
        }
        step += SKEW_STEP;
    }

    best_angle
}

/// Rotates an image around its center by `degrees` (counter-clockwise)
/// using nearest-neighbor sampling.
fn rotate(image: &GrayImage, degrees: f32) -> GrayImage {
    let (width, height) = image.dimensions();
    let radians = (degrees as f64).to_radians();
    let (sin, cos) = radians.sin_cos();

    let cx = width as f64 / 2.0;
    let cy = height as f64 / 2.0;

    let mut out = ImageBuffer::new(width, height);
    for y in 0..height {
        for x in 0..width {
            let dx = x as f64 - cx;
            let dy = y as f64 - cy;
            let src_x = (cx + dx * cos - dy * sin).round();
            let src_y = (cy + dx * sin + dy * cos).round();

            if src_x >= 0.0 && src_x < width as f64 && src_y >= 0.0 && src_y < height as f64 {
                let pixel = image.get_pixel(src_x as u32, src_y as u32);
                out.put_pixel(x, y, *pixel);
            } else {
                out.put_pixel(x, y, Luma([255u8]));
            }
        }
    }
    out
}

/// Variance of the horizontal projection profile: rows that contain text
/// aligned horizontally produce a high variance; skewed text lowers it.
fn horizontal_projection_variance(image: &GrayImage) -> f64 {
    let (width, height) = image.dimensions();
    let mut profile = Vec::with_capacity(height as usize);
    let mut mean: f64 = 0.0;

    for y in 0..height {
        let mut ink: u64 = 0;
        for x in 0..width {
            let pixel = image.get_pixel(x, y).0[0];
            ink += (255 - pixel) as u64;
        }
        let row = ink as f64;
        mean += row;
        profile.push(row);
    }

    if profile.is_empty() {
        return 0.0;
    }
    mean /= profile.len() as f64;

    profile
        .iter()
        .map(|row| {
            let delta = row - mean;
            delta * delta
        })
        .sum::<f64>()
        / profile.len() as f64
}

/// Otsu thresholding: computes the threshold that maximizes between-class
/// variance and applies it to produce a clean black/white image.
fn otsu_binarize(image: &GrayImage) -> GrayImage {
    let mut histogram = [0u64; 256];
    for pixel in image.pixels() {
        histogram[pixel.0[0] as usize] += 1;
    }

    let total_pixels = (image.width() * image.height()) as u64;
    let mut sum_total: u64 = 0;
    for (index, count) in histogram.iter().enumerate() {
        sum_total += (index as u64) * count;
    }

    let mut sum_background: u64 = 0;
    let mut weight_background: u64 = 0;
    let mut threshold = 127u8;
    let mut best_variance: f64 = 0.0;

    for (candidate, count) in histogram.iter().enumerate() {
        weight_background += count;
        if weight_background == 0 {
            continue;
        }
        let weight_foreground = total_pixels - weight_background;
        if weight_foreground == 0 {
            break;
        }

        sum_background += (candidate as u64) * count;
        let mean_background = sum_background as f64 / weight_background as f64;
        let mean_foreground =
            (sum_total as f64 - sum_background as f64) / weight_foreground as f64;

        let delta = mean_background - mean_foreground;
        let between_variance =
            weight_background as f64 * weight_foreground as f64 * delta * delta;

        // `>=` (instead of `>`) breaks ties toward the highest threshold.
        // With sparse histograms the variance profile is flat between class
        // clusters; keeping the last max places the cut strictly inside the
        // gap so text pixels (dark) never fall on the "white" side.
        if between_variance >= best_variance {
            best_variance = between_variance;
            threshold = candidate as u8;
        }
    }

    let mut out = ImageBuffer::new(image.width(), image.height());
    for (x, y, pixel) in image.enumerate_pixels() {
        let value = if pixel.0[0] >= threshold { 255 } else { 0 };
        out.put_pixel(x, y, Luma([value]));
    }
    out
}

/// Runs the local Tesseract OCR over a binary image and parses its TSV output
/// into words with bounding boxes and confidence scores.
fn run_tesseract_on(image: &GrayImage) -> Result<Vec<Word>, KonoError> {
    let temp_path = write_temp_image(image)?;
    let result = Command::new("tesseract")
        .arg(&temp_path)
        .arg("stdout")
        .arg("tsv")
        .arg("--psm")
        .arg("3")
        .output();

    let _ = std::fs::remove_file(&temp_path);

    let output = match result {
        Ok(output) if output.status.success() => output,
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
            return Err(KonoError::Tesseract(stderr));
        }
        Err(err) => {
            let message = format!("failed to launch tesseract (is it installed?): {err}");
            warn!(message);
            return Err(KonoError::Tesseract(message));
        }
    };

    let tsv = String::from_utf8_lossy(&output.stdout).into_owned();
    parse_tsv_words(&tsv, image.height())
}

/// Writes the binarized image to a temporary PNG file for Tesseract.
fn write_temp_image(image: &GrayImage) -> Result<PathBuf, KonoError> {
    let path = std::env::temp_dir().join(format!("kono_ocr_{}.png", Uuid::new_v4()));
    image.save(&path)?;
    Ok(path)
}

/// Parses the Tesseract `tsv` output into word-level results, converting the
/// top-left pixel origin into the bottom-left PDF-point origin of the payload.
fn parse_tsv_words(tsv: &str, image_height: u32) -> Result<Vec<Word>, KonoError> {
    let mut words = Vec::new();
    let mut lines = tsv.lines();

    // Header row: skip it.
    lines.next();

    for line in lines {
        let columns: Vec<&str> = line.split('\t').collect();
        if columns.len() < 12 {
            continue;
        }
        // Level 5 rows are word-level entries.
        if columns[0].trim() != "5" {
            continue;
        }

        let text = columns[11].trim();
        if text.is_empty() {
            continue;
        }

        let left: f64 = columns[6].trim().parse().unwrap_or(0.0);
        let top: f64 = columns[7].trim().parse().unwrap_or(0.0);
        let width: f64 = columns[8].trim().parse().unwrap_or(0.0);
        let height: f64 = columns[9].trim().parse().unwrap_or(0.0);
        let confidence_pct: f64 = columns[10].trim().parse().unwrap_or(0.0);

        // Skip words OCR rejected outright.
        if confidence_pct < 0.0 {
            continue;
        }

        // Convert to bottom-left origin (PDF points, 72 dpi ~ 1px = 1pt).
        let y_top = image_height as f64 - (top + height);

        words.push(Word {
            text: text.to_string(),
            bbox: [left, y_top, left + width, y_top + height],
            page: 1,
            confidence: (confidence_pct / 100.0).clamp(0.0, 1.0),
        });
    }

    Ok(words)
}

/// SHA-256 digest of the raw image for deduplication.
pub fn hash_file(path: &Path) -> Result<String, KonoError> {
    let mut hasher = Sha256::new();
    let mut file = std::fs::File::open(path)?;
    std::io::copy(&mut file, &mut hasher)?;
    Ok(format!("{:x}", hasher.finalize()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn synthetic_text_page() -> GrayImage {
        let (width, height) = (600u32, 400u32);
        let mut image = ImageBuffer::from_pixel(width, height, Luma([255u8]));
        // Simple dark glyphs resembling text rows.
        for row in (80..320).step_by(40) {
            for x in 40..560 {
                image.put_pixel(x, row, Luma([20u8]));
                image.put_pixel(x, row + 1, Luma([20u8]));
            }
        }
        image
    }

    #[test]
    fn preprocessing_keeps_ink_pixels() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("page.png");
        synthetic_text_page().save(&path).expect("save png");

        let processed = preprocess_image(&path).expect("preprocess");
        let dark_pixels = processed
            .binarized
            .pixels()
            .filter(|pixel| pixel.0[0] == 0)
            .count();

        assert!(
            dark_pixels > 100,
            "binarized image lost its text ink (dark pixels: {dark_pixels})"
        );
    }

    #[test]
    fn detects_known_skew_angle() {
        let straight = synthetic_text_page();
        let rotated = rotate(&straight, 15.0);
        let detected = find_skew_angle(&rotated);
        assert!(
            (detected.abs() - 15.0).abs() < 1.0,
            "expected ~15deg skew, got {detected}"
        );
    }

    #[test]
    fn parses_tesseract_tsv_with_coordinate_conversion() {
        let tsv = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n\
                   5\t1\t1\t1\t1\t1\t100\t50\t40\t12\t95.0\tFACTURA\n\
                   5\t1\t1\t1\t1\t2\t150\t50\t30\t12\t90.0\tTOTAL\n";
        let words = parse_tsv_words(tsv, 400).expect("parse tsv");

        assert_eq!(words.len(), 2);
        assert_eq!(words[0].text, "FACTURA");
        assert_eq!(words[0].bbox[0], 100.0);
        // top-left (50) converted to bottom-left origin on a 400px image.
        assert_eq!(words[0].bbox[1], 400.0 - (50.0 + 12.0));
        assert_eq!(words[0].confidence, 0.95);
        assert_eq!(words[0].page, 1);
    }

    #[test]
    fn rejects_negative_confidence_rows() {
        let tsv = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n\
                   5\t1\t1\t1\t1\t1\t0\t0\t0\t0\t-1\t\n";
        let words = parse_tsv_words(tsv, 100).expect("parse tsv");
        assert!(words.is_empty());
    }
}

