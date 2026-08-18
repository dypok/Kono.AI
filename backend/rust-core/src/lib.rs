//! Kono.ai Rust Ingestion Core — library surface exposed for integration
//! testing and reuse by the daemon binary (`main.rs`).

pub mod errors;
pub mod img_preprocessor;
pub mod pdf_triage;
pub mod queue_publisher;
pub mod types;
