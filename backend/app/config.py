from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    project_root: Path
    backend_dir: Path
    storage_dir: Path
    uploads_dir: Path
    results_dir: Path
    models_dir: Path
    frontend_dist_dir: Path
    max_upload_bytes: int
    max_ai_upscale_pixels: int
    cors_origins: tuple[str, ...]


def get_settings() -> Settings:
    project_root = Path(__file__).resolve().parents[2]
    backend_dir = project_root / "backend"
    storage_dir = project_root / "storage"
    uploads_dir = storage_dir / "uploads"
    results_dir = storage_dir / "results"
    models_dir = backend_dir / "models"
    frontend_dist_dir = project_root / "frontend" / "dist"

    return Settings(
        project_root=project_root,
        backend_dir=backend_dir,
        storage_dir=storage_dir,
        uploads_dir=uploads_dir,
        results_dir=results_dir,
        models_dir=models_dir,
        frontend_dist_dir=frontend_dist_dir,
        max_upload_bytes=10 * 1024 * 1024,
        max_ai_upscale_pixels=1024 * 1024,
        cors_origins=(
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:4173",
            "http://localhost:4173",
            "http://127.0.0.1:3000",
            "http://localhost:3000",
        ),
    )
