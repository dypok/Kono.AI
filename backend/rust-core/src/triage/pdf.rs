use std::path::Path;
use lopdf::content::Content;
use lopdf::{Document, Object};
use sha2::{Digest, Sha256};
use tracing::debug;
use uuid::Uuid;

use crate::errors::KonoError;
use crate::types::{DocumentPayload, Word};

const DIGITAL_TEXT_THRESHOLD_CHARS: usize = 50;
const AVG_GLYPH_WIDTH_EM: f32 = 0.5;

/// Inspects a PDF, decides whether it contains a vectorial text layer and extracts words with bounding boxes.
pub fn inspect_and_extract_pdf(path: &Path) -> Result<DocumentPayload, KonoError> {
    let document = Document::load(path)?;
    let file_hash = hash_file(path)?;

    let mut words = Vec::new();
    let mut total_chars = 0usize;
    let mut pages_count = 0u32;

    for (page_number, page_id) in document.get_pages().values().enumerate() {
        let page_number = (page_number + 1) as u32;
        let page_words = match extract_page_words(&document, *page_id) {
            Ok((page_words, page_chars)) => {
                total_chars += page_chars;
                page_words
            }
            Err(KonoError::EmptyDocument(_)) => Vec::new(),
            Err(err) => return Err(err),
        };
        for mut word in page_words {
            word.page = page_number;
            words.push(word);
        }
        pages_count = page_number;
    }

    let is_digital = total_chars > DIGITAL_TEXT_THRESHOLD_CHARS;
    debug!(
        "pdf triage: pages={} chars={} digital={} path={}",
        pages_count, total_chars, is_digital, path.display()
    );

    let classifier = crate::triage::classifier::DocumentClassifier::new();
    let (doc_type, score, matched_anchors) = classifier.classify(&words);

    let document_id = Uuid::new_v4().to_string();
    Ok(DocumentPayload::new(
        document_id,
        file_hash,
        path.to_string_lossy().into_owned(),
        is_digital,
        pages_count,
        words,
    ).with_classification(doc_type, score, matched_anchors))
}

fn extract_page_words(
    document: &Document,
    page_id: lopdf::ObjectId,
) -> Result<(Vec<Word>, usize), KonoError> {
    let content = document.get_page_content(page_id)?;
    let decoded = Content::decode(&content)?;

    let mut words: Vec<Word> = Vec::new();
    let mut chars = 0usize;
    let mut text_matrix: [f32; 6] = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
    let mut cursor_x: f32 = 0.0;
    let mut font_size: f32 = 12.0;

    for op in &decoded.operations {
        match op.operator.as_str() {
            "BT" => {
                text_matrix = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
                cursor_x = 0.0;
            }
            "Tm" => {
                if let Some(matrix) = parse_text_matrix(&op.operands) {
                    text_matrix = matrix;
                    cursor_x = text_matrix[4];
                }
            }
            "Td" | "TD" => {
                if let Some((tx, ty)) = parse_translation(&op.operands) {
                    text_matrix[4] += tx;
                    text_matrix[5] += ty;
                    cursor_x = text_matrix[4];
                }
            }
            "T*" => {
                text_matrix[4] = 0.0;
                text_matrix[5] -= font_size * 1.2;
                cursor_x = 0.0;
            }
            "Tf" => {
                if let Some(size) = parse_font_size(&op.operands) {
                    font_size = size;
                }
            }
            "Tj" => {
                if let Some(text) = op.operands.first().and_then(decode_string) {
                    let (pushed, pushed_chars) = push_words(
                        &text,
                        &mut words,
                        &mut cursor_x,
                        text_matrix[5],
                        font_size,
                    );
                    chars += pushed_chars;
                    text_matrix[4] = cursor_x;
                    let _ = pushed;
                }
            }
            "TJ" => {
                if let Some(Ok(array)) = op.operands.first().map(Object::as_array) {
                    for element in array {
                        if let Some(text) = decode_string(element) {
                            let (_, pushed_chars) = push_words(
                                &text,
                                &mut words,
                                &mut cursor_x,
                                text_matrix[5],
                                font_size,
                            );
                            chars += pushed_chars;
                        } else if let Ok(kerning) = element.as_float() {
                            cursor_x -= kerning / 1000.0 * font_size;
                        }
                    }
                    text_matrix[4] = cursor_x;
                }
            }
            _ => {}
        }
    }

    if chars == 0 {
        return Err(KonoError::EmptyDocument("no vectorial text found".into()));
    }

    Ok((words, chars))
}

fn push_words(
    text: &str,
    words: &mut Vec<Word>,
    cursor_x: &mut f32,
    y: f32,
    font_size: f32,
) -> (usize, usize) {
    let mut pushed = 0usize;
    let mut chars = 0usize;
    let height = font_size as f64;

    for token in text.split_whitespace() {
        let width = (token.chars().count() as f32 * font_size * AVG_GLYPH_WIDTH_EM) as f64;
        words.push(Word {
            text: token.to_string(),
            bbox: [
                *cursor_x as f64,
                y as f64,
                (*cursor_x as f64) + width,
                y as f64 + height,
            ],
            page: 0,
            confidence: 1.0,
        });
        *cursor_x += width as f32;
        chars += token.chars().count();
        pushed += 1;
    }

    if pushed > 0 {
        *cursor_x += font_size * 0.2;
    }
    (pushed, chars)
}

fn parse_text_matrix(operands: &[Object]) -> Option<[f32; 6]> {
    if operands.len() < 6 {
        return None;
    }
    let mut matrix = [0.0f32; 6];
    for (index, slot) in matrix.iter_mut().enumerate() {
        *slot = operands[index].as_float().ok()?;
    }
    Some(matrix)
}

fn parse_translation(operands: &[Object]) -> Option<(f32, f32)> {
    if operands.len() < 2 {
        return None;
    }
    Some((operands[0].as_float().ok()?, operands[1].as_float().ok()?))
}

fn parse_font_size(operands: &[Object]) -> Option<f32> {
    operands.get(1).and_then(|operand| operand.as_float().ok())
}

fn decode_string(obj: &Object) -> Option<String> {
    match obj {
        Object::String(bytes, _) => {
            let data = bytes.as_slice();
            if data.len() >= 2 && data.len() % 2 == 0 && data.starts_with(&[0xfe, 0xff]) {
                let utf16: Vec<u16> = data[2..]
                    .chunks_exact(2)
                    .map(|chunk| u16::from_be_bytes([chunk[0], chunk[1]]))
                    .collect();
                return String::from_utf16(&utf16).ok();
            }
            String::from_utf8(data.to_vec()).ok()
        }
        _ => None,
    }
}

pub fn hash_file(path: &Path) -> Result<String, KonoError> {
    let mut hasher = Sha256::new();
    let mut file = std::fs::File::open(path)?;
    std::io::copy(&mut file, &mut hasher)?;
    Ok(format!("{:x}", hasher.finalize()))
}
