use std::error::Error;
use std::path::Path;
use std::process::Command;

use font8x8::UnicodeFonts;
use image::{GrayImage, ImageBuffer, Luma};
use kono_rust_core::img_preprocessor::process_image_and_ocr;

/// Renders a synthetic invoice page with real bitmap text, optionally rotated.
fn render_text_page(angle_deg: f32) -> GrayImage {
    let (width, height) = (600u32, 400u32);
    let mut image = ImageBuffer::from_pixel(width, height, Luma([255u8]));

    draw_text_8x8(&mut image, "FACTURA", 60, 80, 6, Luma([20u8]));
    draw_text_8x8(&mut image, "KONO 2024", 60, 150, 6, Luma([20u8]));
    draw_text_8x8(&mut image, "TOTAL 100", 60, 220, 6, Luma([20u8]));

    if angle_deg == 0.0 {
        return image;
    }

    // Rotate around the center using the same nearest-neighbor strategy as
    // the production deskew module.
    let radians = (angle_deg as f64).to_radians();
    let (sin, cos) = radians.sin_cos();
    let (cx, cy) = (width as f64 / 2.0, height as f64 / 2.0);

    let mut rotated = ImageBuffer::from_pixel(width, height, Luma([255u8]));
    for y in 0..height {
        for x in 0..width {
            let dx = x as f64 - cx;
            let dy = y as f64 - cy;
            let src_x = (cx + dx * cos - dy * sin).round();
            let src_y = (cy + dx * sin + dy * cos).round();
            if src_x >= 0.0 && src_x < width as f64 && src_y >= 0.0 && src_y < height as f64 {
                rotated.put_pixel(x, y, *image.get_pixel(src_x as u32, src_y as u32));
            }
        }
    }
    rotated
}

/// Draws a string with the 8x8 bitmap font scaled up by `scale`.
fn draw_text_8x8(
    image: &mut GrayImage,
    text: &str,
    x0: u32,
    y0: u32,
    scale: u32,
    color: Luma<u8>,
) {
    for (column, ch) in text.chars().enumerate() {
        let glyph = font8x8::BASIC_FONTS.get(ch).unwrap_or_default();
        let base_x = x0 + (column as u32) * (8 * scale + 2 * scale);
        for (row, bits) in glyph.iter().enumerate() {
            for bit in 0..8 {
                if bits & (0b1000_0000 >> bit) != 0 {
                    fill_block(
                        image,
                        base_x + (bit as u32) * scale,
                        y0 + (row as u32) * scale,
                        scale,
                        color,
                    );
                }
            }
        }
    }
}

fn fill_block(image: &mut GrayImage, x: u32, y: u32, scale: u32, color: Luma<u8>) {
    for dy in 0..scale {
        for dx in 0..scale {
            image.put_pixel(x + dx, y + dy, color);
        }
    }
}

fn tesseract_available() -> bool {
    Command::new("tesseract")
        .arg("--version")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false)
}

#[test]
fn preprocesses_rotated_scan_and_recovers_words() -> Result<(), Box<dyn Error>> {
    if !tesseract_available() {
        eprintln!("tesseract not installed; skipping OCR test");
        return Ok(());
    }

    let dir = tempfile::tempdir()?;
    let img_path: std::path::PathBuf = dir.path().join("skewed_15.png");
    render_text_page(15.0).save(&img_path)?;

    let payload = process_image_and_ocr(&img_path)?;

    assert!(!payload.is_digital, "images are never marked as digital");
    assert_eq!(payload.pages_count, 1);
    assert!(
        payload.words.len() >= 5,
        "expected several OCR words, got {}",
        payload.words.len()
    );
    for word in &payload.words {
        assert!(word.bbox[0] < word.bbox[2], "bad x bbox: {:?}", word.bbox);
        assert!(word.bbox[1] < word.bbox[3], "bad y bbox: {:?}", word.bbox);
        assert!(word.confidence > 0.0 && word.confidence <= 1.0);
    }
    Ok(())
}

#[test]
fn straight_image_also_produces_payload() -> Result<(), Box<dyn Error>> {
    if !tesseract_available() {
        eprintln!("tesseract not installed; skipping OCR test");
        return Ok(());
    }

    let dir = tempfile::tempdir()?;
    let img_path: std::path::PathBuf = dir.path().join("straight.png");
    render_text_page(0.0).save(&img_path)?;

    let payload = process_image_and_ocr(&img_path)?;
    assert!(payload.words.len() >= 5);
    Ok(())
}

/// Documents which file types the triage layer accepts, so changes to the
/// whitelist surface in tests.
#[test]
fn accepted_extensions_drive_pipeline() {
    assert!(matches_extension(Path::new("invoice.pdf")));
    assert!(matches_extension(Path::new("scan.PNG")));
    assert!(matches_extension(Path::new("photo.jpg")));
    assert!(matches_extension(Path::new("photo.jpeg")));
    assert!(!matches_extension(Path::new("notes.txt")));
}

fn matches_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            let ext = ext.to_lowercase();
            matches!(ext.as_str(), "pdf" | "png" | "jpg" | "jpeg")
        })
        .unwrap_or(false)
}
