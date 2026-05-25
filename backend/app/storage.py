from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class StoredFiles:
    job_id: str
    upload_path: Path
    result_path: Path


def ensure_dirs(*dirs: Path) -> None:
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


def new_job_paths(uploads_dir: Path, results_dir: Path, upload_suffix: str, result_suffix: str) -> StoredFiles:
    job_id = str(uuid.uuid4())
    upload_path = uploads_dir / f"{job_id}{upload_suffix}"
    result_path = results_dir / f"{job_id}{result_suffix}"
    return StoredFiles(job_id=job_id, upload_path=upload_path, result_path=result_path)


def safe_suffix(filename: str | None) -> str:
    if not filename:
        return ".bin"
    _, ext = os.path.splitext(filename)
    ext = (ext or "").lower().strip()
    if ext in {".jpg", ".jpeg", ".png", ".webp"}:
        return ".jpg" if ext == ".jpeg" else ext
    return ".bin"
