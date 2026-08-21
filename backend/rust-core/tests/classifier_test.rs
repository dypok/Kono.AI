use kono_rust_core::triage::DocumentClassifier;
use kono_rust_core::types::{DocumentType, Word};

#[test]
fn test_rust_classifier_identifies_invoice() {
    let classifier = DocumentClassifier::new();
    let words = vec![
        Word { text: "FACTURA".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "ELECTRÓNICA".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "DE".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "VENTA".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "NIT:".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "890.903.938-8".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "SUBTOTAL:".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "1,500,000".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "IVA:".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "TOTAL".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "A".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "PAGAR:".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
    ];

    let (doc_type, score, matched) = classifier.classify(&words);
    assert_eq!(doc_type, DocumentType::Invoice);
    assert!(score >= 0.22, "Score should be >= 0.22, got {}", score);
    assert!(matched.contains(&"DOCUMENT_TYPE".to_string()));
    assert!(matched.contains(&"TOTAL".to_string()));
}

#[test]
fn test_rust_classifier_discards_non_invoice() {
    let classifier = DocumentClassifier::new();
    let words = vec![
        Word { text: "Curriculum".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "Vitae".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "Software".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "Engineer".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
        Word { text: "Experience".to_string(), bbox: [0.0, 0.0, 10.0, 10.0], page: 1, confidence: 1.0 },
    ];

    let (doc_type, score, _) = classifier.classify(&words);
    assert_eq!(doc_type, DocumentType::Other);
    assert!(score < 0.15, "Score should be < 0.15, got {}", score);
}
