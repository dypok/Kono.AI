# ==============================================================================
# 🦀 Rust Core (Ingestor, Fast PDF Triage & Image Pre-processor)
# Multi-stage build for ultra-lightweight production binary
# ==============================================================================

# Build Stage
FROM rust:1.80-alpine AS builder

RUN apk add --no-cache musl-dev pkgconfig openssl-dev clang-dev make

WORKDIR /usr/src/kono-rust-core

# Cache dependencies
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release || true && rm -rf src

# Build actual application
COPY . .
RUN cargo build --release

# Final Stage (Minimal Alpine image < 20MB)
FROM alpine:3.20

RUN apk add --no-cache libgcc libssl3 ca-certificates tesseract-ocr tesseract-ocr-data-spa tesseract-ocr-data-eng

WORKDIR /app

COPY --from=builder /usr/src/kono-rust-core/target/release/kono-rust-core /app/kono-rust-core

ENV RUST_LOG=info

CMD ["/app/kono-rust-core"]
