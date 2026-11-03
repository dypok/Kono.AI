use image::{GrayImage, ImageBuffer, Luma};

const SKEW_MIN_DEG: i32 = -30;
const SKEW_MAX_DEG: i32 = 30;
const SKEW_STEP: f32 = 0.5;

pub struct ProcessedImage {
    pub binarized: GrayImage,
    pub skew_angle: f32,
}

pub fn preprocess_image(path: &std::path::Path) -> Result<ProcessedImage, crate::errors::KonoError> {
    let image = image::open(path)?;
    let gray = image.to_luma8();

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

pub fn find_skew_angle(image: &GrayImage) -> f32 {
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

pub fn rotate(image: &GrayImage, degrees: f32) -> GrayImage {
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

pub fn horizontal_projection_variance(image: &GrayImage) -> f64 {
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

pub fn otsu_binarize(image: &GrayImage) -> GrayImage {
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
