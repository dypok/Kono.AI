use std::collections::HashMap;
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};
use tracing::debug;

use crate::types::{DocumentType, Word};

const DEFAULT_KNOWLEDGE_BASE_JSON: &str = include_str!("../../../python-api/app/engine/knowledge_base.json");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeBase {
    pub anchors: HashMap<String, Vec<String>>,
}

pub struct DocumentClassifier {
    knowledge_base: KnowledgeBase,
    weights: HashMap<String, f64>,
}

impl Default for DocumentClassifier {
    fn default() -> Self {
        Self::new()
    }
}

impl DocumentClassifier {
    pub fn new() -> Self {
        // Try to load knowledge_base.json from disk, fallback to embedded string
        let kb: KnowledgeBase = match Self::load_from_disk() {
            Some(kb) => kb,
            None => serde_json::from_str(DEFAULT_KNOWLEDGE_BASE_JSON).unwrap_or_else(|_| KnowledgeBase {
                anchors: HashMap::new(),
            }),
        };

        let mut weights = HashMap::new();
        weights.insert("DOCUMENT_TYPE".to_string(), 3.0);
        weights.insert("TOTAL".to_string(), 2.5);
        weights.insert("INVOICE_NUMBER".to_string(), 2.5);
        weights.insert("TAX_ID".to_string(), 2.0);
        weights.insert("SUBTOTAL".to_string(), 1.5);
        weights.insert("TAX".to_string(), 1.5);
        weights.insert("DATE".to_string(), 1.0);
        weights.insert("SUPPLIER".to_string(), 1.0);
        weights.insert("CUSTOMER".to_string(), 0.5);

        Self {
            knowledge_base: kb,
            weights,
        }
    }

    fn load_from_disk() -> Option<KnowledgeBase> {
        let candidate_paths = [
            Path::new("/app/app/engine/knowledge_base.json"),
            Path::new("../python-api/app/engine/knowledge_base.json"),
            Path::new("backend/python-api/app/engine/knowledge_base.json"),
            Path::new("knowledge_base.json"),
        ];

        for p in candidate_paths {
            if p.exists() {
                if let Ok(content) = fs::read_to_string(p) {
                    if let Ok(kb) = serde_json::from_str::<KnowledgeBase>(&content) {
                        debug!("Loaded knowledge_base.json from: {}", p.display());
                        return Some(kb);
                    }
                }
            }
        }
        None
    }

    /// Classifies words into (DocumentType, score 0..1, matched_anchors)
    pub fn classify(&self, words: &[Word]) -> (DocumentType, f64, Vec<String>) {
        if words.is_empty() {
            return (DocumentType::Other, 0.0, Vec::new());
        }

        let full_text: String = words
            .iter()
            .map(|w| w.text.as_str())
            .collect::<Vec<_>>()
            .join(" ")
            .to_lowercase();

        let mut matched_anchors = Vec::new();
        let mut score = 0.0;
        let max_possible: f64 = self.weights.values().sum();

        for (anchor_key, patterns) in &self.knowledge_base.anchors {
            let weight = self.weights.get(anchor_key).copied().unwrap_or(1.0);
            for pattern in patterns {
                let clean_pat = pattern.to_lowercase().replace("\\s+", " ").replace("\\b", "");
                if full_text.contains(&clean_pat) || clean_pat.split_whitespace().all(|part| full_text.contains(part)) {
                    matched_anchors.push(anchor_key.clone());
                    score += weight;
                    break;
                }
            }
        }

        let normalized_score = if max_possible > 0.0 {
            (score / max_possible).min(1.0)
        } else {
            0.0
        };

        let doc_type = if normalized_score >= 0.22 {
            DocumentType::Invoice
        } else if normalized_score >= 0.15 {
            DocumentType::Receipt
        } else {
            DocumentType::Other
        };

        (doc_type, (normalized_score * 10000.0).round() / 10000.0, matched_anchors)
    }
}
