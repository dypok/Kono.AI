from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Kono.ai Financial Invoicing API",
    version="1.0.0",
    description="Deterministic Extractor, Validator and Financial Reconciler API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "kono-python-api"}

@app.get("/api/v1/ping")
async def ping():
    return {"message": "pong", "kono_status": "ready"}
