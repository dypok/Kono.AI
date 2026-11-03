use std::error::Error;
use std::path::Path;

use lopdf::content::{Content, Operation};
use lopdf::{dictionary, Document, Object, Stream, StringFormat};

use kono_rust_core::pdf_triage::inspect_and_extract_pdf;

const MEDIA_BOX: [f32; 4] = [0.0, 0.0, 612.0, 792.0];

/// Builds a single-page PDF, optionally including a vectorial text layer.
fn build_test_pdf(path: &Path, with_text: bool) -> Result<(), Box<dyn Error>> {
    let mut doc = Document::with_version("1.5");

    let font_id = doc.add_object(dictionary! {
        "Type" => "Font",
        "Subtype" => "Type1",
        "BaseFont" => "Helvetica",
    });

    let mut operations: Vec<Operation> = Vec::new();
    if with_text {
        operations.extend([
            Operation::new("BT", vec![]),
            Operation::new(
                "Tf",
                vec![Object::Name(b"F1".to_vec()), Object::Real(14.0)],
            ),
            Operation::new(
                "Td",
                vec![Object::Real(100.0), Object::Real(700.0)],
            ),
            Operation::new(
                "Tj",
                vec![Object::String(
                    b"FACTURA DE PRUEBA KONO".to_vec(),
                    StringFormat::Literal,
                )],
            ),
            Operation::new(
                "Td",
                vec![Object::Real(0.0), Object::Real(-20.0)],
            ),
            Operation::new(
                "Tj",
                vec![Object::String(
                    b"NIT 9012345678".to_vec(),
                    StringFormat::Literal,
                )],
            ),
            Operation::new(
                "Td",
                vec![Object::Real(0.0), Object::Real(-20.0)],
            ),
            Operation::new(
                "Tj",
                vec![Object::String(
                    b"SUBTOTAL 100.00".to_vec(),
                    StringFormat::Literal,
                )],
            ),
            Operation::new(
                "Td",
                vec![Object::Real(0.0), Object::Real(-20.0)],
            ),
            Operation::new(
                "Tj",
                vec![Object::String(
                    b"TOTAL 100.50".to_vec(),
                    StringFormat::Literal,
                )],
            ),
            Operation::new("ET", vec![]),
        ]);
    }

    let content = Content {
        operations,
    };
    let content_bytes = content.encode()?;
    let content_id = doc.add_object(Stream::new(lopdf::Dictionary::new(), content_bytes));

    let pages_id = doc.new_object_id();
    let page_id = doc.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "MediaBox" => vec![
            Object::Real(MEDIA_BOX[0]),
            Object::Real(MEDIA_BOX[1]),
            Object::Real(MEDIA_BOX[2]),
            Object::Real(MEDIA_BOX[3]),
        ],
        "Resources" => dictionary! {
            "Font" => dictionary! { "F1" => font_id },
        },
        "Contents" => content_id,
    });

    doc.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Kids" => vec![page_id.into()],
            "Count" => 1,
        }),
    );

    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });
    doc.trailer.set("Root", catalog_id);

    doc.save(path)?;
    Ok(())
}

#[test]
fn extracts_vectorial_text_and_marks_digital() -> Result<(), Box<dyn Error>> {
    let dir = tempfile::tempdir()?;
    let pdf_path = dir.path().join("digital.pdf");
    build_test_pdf(&pdf_path, true)?;

    let payload = inspect_and_extract_pdf(&pdf_path)?;

    assert!(payload.is_digital, "vectorial text must be detected as digital");
    assert_eq!(payload.pages_count, 1);
    assert!(payload.words.len() >= 4, "expected >= 4 words, got {}", payload.words.len());

    let texts: Vec<&str> = payload.words.iter().map(|w| w.text.as_str()).collect();
    assert!(texts.contains(&"FACTURA"), "missing FACTURA word: {texts:?}");
    assert!(texts.contains(&"TOTAL"), "missing TOTAL word: {texts:?}");

    // Coordinates must be non-degenerate and within the page.
    for word in &payload.words {
        assert!(word.bbox[0] < word.bbox[2], "x0 < x1 violated: {:?}", word.bbox);
        assert!(word.bbox[1] < word.bbox[3], "y0 < y1 violated: {:?}", word.bbox);
        assert!(word.bbox[0] >= 0.0 && word.bbox[2] <= MEDIA_BOX[2] as f64);
        assert_eq!(word.confidence, 1.0, "vectorial words have full confidence");
        assert_eq!(word.page, 1);
    }

    Ok(())
}

#[test]
fn pdf_without_text_layer_is_marked_as_scan() -> Result<(), Box<dyn Error>> {
    let dir = tempfile::tempdir()?;
    let pdf_path = dir.path().join("scan.pdf");
    build_test_pdf(&pdf_path, false)?;

    let payload = inspect_and_extract_pdf(&pdf_path)?;

    assert!(!payload.is_digital, "empty text layer must not be digital");
    assert!(payload.words.is_empty(), "no words expected on a scan page");
    Ok(())
}
