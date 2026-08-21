import os
import hashlib
from pathlib import Path
from typing import Optional, Tuple
from app.models.document import Document
from app.core.config import get_settings

class StorageService:
    """
    Centralized canonical document and file resolution service.
    Handles primary file lookup, multi-directory fallbacks, and sha256 hash matching.
    """

    def __init__(self):
        self.settings = get_settings()

    def resolve_document_file(self, doc: Document) -> Tuple[Optional[Path], bool]:
        """
        Resolves the physical binary file path for a Document instance.
        Returns (Path, exists_boolean).
        """
        # 1. Direct path check
        if doc.file_path:
            direct = Path(doc.file_path)
            if direct.exists() and direct.is_file():
                return direct, True

        # 2. Check canonical storage directories
        storage_base = Path(self.settings.storage_dir)
        fname = doc.file_name or f"{doc.id}.pdf"
        candidates = [
            storage_base / "processed" / f"{doc.id}.pdf",
            storage_base / "processed" / f"{doc.id}.png",
            storage_base / "processed" / f"{doc.id}.jpg",
            storage_base / "processed" / fname,
            storage_base / "inbound" / f"{doc.id}.pdf",
            storage_base / "inbound" / f"{doc.id}.png",
            storage_base / "inbound" / f"{doc.id}.jpg",
            storage_base / "inbound" / fname,
            Path("/data/storage/processed") / f"{doc.id}.pdf",
            Path("/data/storage/processed") / fname,
            Path("/data/storage/inbound") / f"{doc.id}.pdf",
            Path("/data/storage/inbound") / fname,
            Path("scripts/facturas_pdf") / fname,
            Path("/app/scripts/facturas_pdf") / fname,
        ]

        for cand in candidates:
            if cand.exists() and cand.is_file():
                return cand, True

        # 3. Hash matching fallback
        if doc.file_hash_sha256:
            for d in [storage_base / "processed", storage_base / "inbound", Path("/data/storage/processed")]:
                if d.exists() and d.is_dir():
                    for entry in d.iterdir():
                        if entry.is_file() and entry.suffix.lower() in [".pdf", ".png", ".jpg", ".jpeg"]:
                            try:
                                with open(entry, "rb") as f:
                                    h = hashlib.sha256(f.read()).hexdigest()
                                    if h == doc.file_hash_sha256:
                                        return entry, True
                            except Exception:
                                continue

        return None, False

storage_service = StorageService()
