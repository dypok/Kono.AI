# Changelog: 21-08-2026
- [Friday]-[21/08/2026]-[06:44] : Full architecture modularization, n8n purge and Rust Core fast document classifier implementation.
  1. Rust Core: Created `triage/classifier.rs` reading `knowledge_base.json` in runtime (<1ms triage) to classify and discard non-invoice documents (`DocumentType::Other`). Added `tests/classifier_test.rs` (100% passing).
  2. Cleaned all unused imports in Rust Core (`watcher.rs` and tests) resulting in zero compiler warnings.
  3. Purged all references and documentation of n8n, formalizing the native REST Webhook with HMAC SHA-256 for ERPs.
  4. Backend: Created `storage_service.py` for canonical file resolution and modernized Pydantic V2 `.model_dump()` in `vendor_matcher.py` (0 warnings across 62 PyTests).
  5. Frontend: Modularized `InvoiceTable.tsx`, `DashboardFilters.tsx`, and `BulkActionBar.tsx` with clean TypeScript build.
  6. Consolidated seed and test invoice generators into `scripts/seed_invoices.py` and purged orphaned `index.html`.
- [Friday]-[21/08/2026]-[07:38] : Generated and updated complete technical documentation and README.md with official repository link (https://github.com/dypok/Kono.IA.git) and group members: Dylan Gamero, Daniel Echeverría, and Sayder Carreño.
