# 🪙 Kono.ai — Intelligent Invoice Extractor, Math Validator & AP Reconciliation Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Architecture: Dual-Backend](https://img.shields.io/badge/Architecture-Rust%20%2B%20Python%20FastAPI-blue.svg)](documentation/back/backend.md)
[![Frontend: React + Liquid Glass](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Tailwind-purple.svg)](documentation/front/frontend.md)
[![Docker: All--in--One](https://img.shields.io/badge/Docker-All--in--One%20Container-2496ED.svg)](Dockerfile.allinone)
[![Status: Beta](https://img.shields.io/badge/Status-v1.0.0--beta-success.svg)](ROADMAP.md)

> *"Zero manual data entry, zero ledger discrepancies: Kono processes, audits, and reconciles invoices with mathematical precision before they touch your accounting books."*

---

## 🧭 Table of Contents
- [What is Kono.ai?](#-what-is-konoai)
- [Target Audience (Who It's For)](#-target-audience-who-its-for)
- [Key Features](#-key-features)
- [Tech Stack & Architecture](#-tech-stack--architecture)
- [Quick Start & Installation (Docker All-in-One)](#-quick-start--installation-docker-all-in-one)
- [Running Automated Tests](#-running-automated-tests)
- [Product Roadmap (>40h Planned Work)](#-product-roadmap-40h-planned-work)
- [Core Team & Maintainers](#-core-team--maintainers)
- [License](#-license)

---

## 🎯 What is Kono.ai?
**Kono.ai** is an ultra-fast, local-first Accounts Payable (AP) automation and financial reconciliation platform. It processes complex vector and scanned PDF invoices and receipts in milliseconds, performing **deterministic spatial extraction (Ray-Casting)** and **arithmetic validation** ($\sum \text{items} = \text{Subtotal} \pm 0.02$, including statutory taxes, discounts, and withholdings).

Unlike generic AI document extractors that incur massive API token costs on every page, Kono uses a **zero-token local pipeline** that resolves $\ge 95\%$ of standard corporate invoices deterministically ($< 15\text{ ms}$ latency), reserving LLM fallback strictly for edge-case unformatted receipts.

---

## 👥 Target Audience (Who It's For)
- **Accounting & Finance Teams in SMBs:** Bookkeepers and accounts payable clerks who process hundreds of vendor invoices monthly and need automated data extraction without manual re-keying into ERPs.
- **Freelance Accountants & Tax Advisors:** Professionals managing multiple corporate clients who need unified multi-inbox Gmail/IMAP sync and strict arithmetic discrepancy detection.
- **Operations & Fintech Developers:** Teams seeking a high-throughput, self-hosted, privacy-first invoice ingestion gateway that runs entirely on local infrastructure with zero data leakage.

---

## 🌟 Key Features

1. **🦀 Microsecond Rust Ingestion & Document Classifier:** Instant SHA-256 deduplication and rapid triage using `lopdf` and an extensible knowledge base to discard non-accounting files in $< 1\text{ ms}$.
2. **🧭 Spatial Ray-Casting Parsing Engine:** Language-agnostic (English / Spanish) positional heuristics extracting invoice numbers, issue dates, vendor Tax IDs, line items, and totals without cloud dependencies.
3. **🧮 Deterministic Math Validator ($\pm 0.02$ Tolerance):** Automatically verifies itemized subtotals against tax rates (VAT/IVA 19%, 16%), discounts, and statutory withholdings.
4. **💵 Dynamic Currency Conversion (USD $\rightarrow$ COP):** Daily official TRM exchange rate synchronization with a 24-hour persistent cache.
5. **📧 Multi-Inbox Native Email Poller:** Continuous background email intake via Gmail OAuth2 and IMAP SSL with automatic hierarchical folder classification (`KONO_INVOICE/{Company}/{Debit|Credit}`).
6. **👁️ Interactive Split-Screen SVG Auditor & Kono Mascot:** Visual audit interface pairing original PDFs with bidirectional bounding box highlights and instant 1-Click approval.

---

## 🏗️ Tech Stack & Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Kono.ai System Architecture                     │
└────────────────────────────────────────────────────────────────────────┘
  [Email Poller / Folder Watcher / REST Webhook / Web Drag & Drop]
                                │
                                ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │ 🦀 Rust Core (Tokio, Notify, Lopdf, Sha2)                          │
  │ • SHA-256 Deduplication   • Fast Document Classifier (<1ms)       │
  │ • Image Preprocessing     • Publishes to Redis Stream              │
  └────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │ 📨 Redis Stream Broker & Persistence                                │
  └────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │ 🐍 Python FastAPI Business & Audit Engine                          │
  │ • Spatial Ray-Casting Parser  • Deterministic Math Validator       │
  │ • USD/COP Currency Converter • WebSocket Live Audit Feed          │
  │ • AI Fallback (OpenAI/Gemini) • SQLite / PostgreSQL Persistence   │
  └────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │ ⚛️ Frontend Web App (React 18, Vite, Tailwind CSS, Lucide)         │
  │ • Silver Titanium & Warm Alabaster Liquid Glass Design System      │
  │ • Split-Screen SVG Bounding Box Viewer & 1-Click Approval          │
  └────────────────────────────────────────────────────────────────────┘
```

- **Core Backend:** Rust (Tokio, Lopdf, Notify-rs, Sha2)
- **API & Audit Engine:** Python 3.11, FastAPI, PyMuPDF (fitz), Redis-py, Pydantic v2
- **Frontend SPA:** React 18, TypeScript, Tailwind CSS, Vite, Liquid Glass Design System
- **Broker & Storage:** Redis Streams, SQLite / PostgreSQL (Supabase compatible)
- **Containerization:** Docker All-in-One orchestration on Port 80

---

## 💻 Quick Start & Installation (Docker All-in-One)

The entire system (Redis, Rust Core, Python FastAPI, and React Nginx SPA) is packaged into a **single, highly-optimized Docker container running on port 80**.

### 📋 Prerequisites
- **Docker** and **Docker Compose** installed (Linux, macOS, or Windows with WSL2).
- **Git** installed.

---

### ⚡ Step 1: Clone the Repository
```bash
git clone https://github.com/dypok/Kono.AI.git
cd Kono.AI
```

---

### ⚙️ Step 2: Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
*(All core services run out-of-the-box with local defaults. AI fallback API keys are strictly optional).*

---

### 🐳 Step 3: Launch with Docker Compose
Build and start the integrated stack:
```bash
docker compose up -d --build
```

---

### 🌐 Step 4: Access the Services
Once running, all endpoints are served through **Port 80**:

| Component | URL | Description |
| :--- | :--- | :--- |
| **⚛️ Web Dashboard (Liquid Glass UI)** | [http://localhost](http://localhost) | Auditor split-screen, Mascot state, and batch management. |
| **🐍 Backend API (Swagger UI)** | [http://localhost/api/v1/ping](http://localhost/api/v1/ping) | Interactive OpenAPI documentation & healthcheck. |
| **⚡ WebSocket Feed** | `ws://localhost/api/v1/ws/audit-feed` | Real-time invoice processing stream. |

---

### 🧪 Step 5: Seed Synthetic Test Invoices
Generate sample test invoices (🟢 Valid, 🟡 Arithmetic Discrepancies, 🔴 Duplicates):
```bash
python scripts/seed_invoices.py
```

---

## 🧪 Running Automated Tests

### Rust Core Unit & Integration Tests:
```bash
cd backend/rust-core
cargo test
```

### Python API & Spatial Engine Test Suite:
```bash
cd backend/python-api
pytest -v
```

---

## 🗺️ Product Roadmap (>40h Planned Work)

Kono.ai has an active, detailed engineering roadmap detailing over 40 hours of planned work across 5 milestones:
- **Milestone 1:** Latin American Electronic Invoicing Compliance (DIAN UBL 2.1 XML & CUFE Cross-Auditor) [~10h]
- **Milestone 2:** Multi-Tier Statutory Withholdings (ReteICA, ReteIVA, Retefuente) & Dynamic FX [~8h]
- **Milestone 3:** Native Cloud ERP & Ledger Connectors (Siigo, QuickBooks Online, Alegra) [~8h]
- **Milestone 4:** Point & Click Interactive SVG Template Learning Builder [~8h]
- **Milestone 5:** 10k Invoices/Hour High-Concurrency Stress Testing & CI/CD Pipeline [~8h]

👉 **Read the full roadmap and technical tasks in [ROADMAP.md](ROADMAP.md).**

---

## 👥 Core Team & Maintainers

| Contributor | Role | Core Focus |
| :--- | :--- | :--- |
| **Dylan Gamero** | **Backend Core & Pipeline Lead** | Ingestion Watcher, SHA-256 Hashing, Python Ray-Casting Engine, REST Ingestion Webhooks |
| **Daniel Echeverría** | **Backend AI & Systems Lead** | Rust PDF Triage & Classifier, Math Validator, Gmail OAuth2/IMAP Sync, Docker |
| **Sayder Carreño** | **Frontend & UX/UI Lead** | React 18, Tailwind CSS, Liquid Glass Design, Split-Screen SVG Viewer, WebSocket UI |

- 🔗 **Official Repository:** [https://github.com/dypok/Kono.AI.git](https://github.com/dypok/Kono.AI.git)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
