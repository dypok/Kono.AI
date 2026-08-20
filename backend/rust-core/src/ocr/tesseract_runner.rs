use std::path::PathBuf;
use std::process::Command;
use image::GrayImage;
use tracing::warn;
use uuid::Uuid;

use crate::errors::KonoError;
use crate::types::Word;

pub fn run_tesseract_on(image: &GrayImage) -> Result<Vec<Word>, KonoError> {
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

fn write_temp_image(image: &GrayImage) -> Result<PathBuf, KonoError> {
    let path = std::env::temp_dir().join(format!("kono_ocr_{}.png", Uuid::new_v4()));
    image.save(&path)?;
    Ok(path)
}

pub fn parse_tsv_words(tsv: &str, image_height: u32) -> Result<Vec<Word>, KonoError> {
    let mut words = Vec::new();
    let mut lines = tsv.lines();

    // Skip header row
    lines.next();

    for line in lines {
        let columns: Vec<&str> = line.split('\t').collect();
        if columns.len() < 12 {
            continue;
        }
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

        if confidence_pct < 0.0 {
            continue;
        }

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
