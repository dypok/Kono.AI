pub mod classifier;
pub mod pdf;

pub use classifier::DocumentClassifier;
pub use pdf::{hash_file, inspect_and_extract_pdf};
