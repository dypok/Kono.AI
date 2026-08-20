# Changelog: 20-08-2026

- [Thursday]-[20/08/2026]-[07:49] : Updated `.gitignore` to explicitly ignore AI agent configs (`.agents/`, `.gemini/`, `.claude/`, `.cursor/`, `skills-lock.json`), sample/generated PDFs (`scripts/facturas_pdf/`, `*.pdf`), and local database files (`*.db`). Untracked all these files from the git repository index while preserving them on local disk.
- [Thursday]-[20/08/2026]-[08:26] : Booted all stack services (Nginx, Vite Frontend, FastAPI Python backend, Rust Core, Redis broker). Configured PostgreSQL Supabase engine initialization in FastAPI app lifespan, installed missing drivers (`asyncpg`, `psycopg2-binary`), and verified that all endpoints respond with HTTP 200.
