# ==============================================================================
# 🦀 Rust Core (Ingestor, Fast PDF Triage & Image Pre-processor)
# Debian-based build for maximum compatibility and ultra-fast compilation
# ==============================================================================

# Build Stage
FROM rust:1.80-slim-bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/kono-rust-core

# Build actual application
COPY Cargo.toml ./
COPY src ./src

RUN cargo build --release

# Final Stage (Slim Debian runtime < 40MB)
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    tesseract-ocr \
    tesseract-ocr-spa \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /usr/src/kono-rust-core/target/release/kono-rust-core /app/kono-rust-core

ENV RUST_LOG=info

CMD ["/app/kono-rust-core"]
