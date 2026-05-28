from __future__ import annotations

import io
from dataclasses import replace
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image
import pytest

from backend.app import main as main_module
from backend.app.config import Settings
from backend.app.storage import ensure_dirs


def _make_image_bytes(fmt: str = "JPEG", size: tuple[int, int] = (96, 64)) -> bytes:
    image = Image.new("RGB", size, color=(180, 140, 90))
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return buffer.getvalue()


@pytest.fixture()
def test_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Settings:
    settings = Settings(
        project_root=tmp_path,
        backend_dir=tmp_path / "backend",
        storage_dir=tmp_path / "storage",
        uploads_dir=tmp_path / "storage" / "uploads",
        results_dir=tmp_path / "storage" / "results",
        models_dir=tmp_path / "backend" / "models",
        frontend_dist_dir=tmp_path / "frontend-dist",
        max_upload_bytes=1024 * 1024,
        cors_origins=("http://127.0.0.1:5173", "http://localhost:5173"),
    )
    ensure_dirs(
        settings.backend_dir,
        settings.storage_dir,
        settings.uploads_dir,
        settings.results_dir,
        settings.models_dir,
        settings.frontend_dist_dir,
    )
    monkeypatch.setattr(main_module, "settings", settings)
    return settings


@pytest.fixture()
def client(test_settings: Settings) -> TestClient:
    return TestClient(main_module.app)


@pytest.mark.parametrize("path", ["/health", "/api/health"])
def test_health_returns_ok(client: TestClient, path: str) -> None:
    response = client.get(path)

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "backend"


@pytest.mark.parametrize("path", ["/model/status", "/api/model/status"])
def test_model_status_returns_ok(client: TestClient, path: str) -> None:
    response = client.get(path)

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "available" in payload
    assert payload["framework"] == "opencv-pillow-fallback"


def test_process_result_download_delete_cycle(client: TestClient) -> None:
    image_bytes = _make_image_bytes()

    process_response = client.post(
        "/api/process",
        files={"file": ("original.jpg", image_bytes, "image/jpeg")},
        data={"prefer_ai": "false", "mode": "enhance"},
    )

    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload["status"] == "completed"
    assert payload["message"] == "Изображение успешно обработано"
    assert payload["id"]
    assert payload["input"]["filename"] == "original.jpg"
    assert payload["input"]["format"] == "JPEG"
    assert payload["output"]["format"] == "PNG"
    assert payload["processing"]["mode"] == "enhance"
    assert payload["processing"]["used_ai"] is False
    assert payload["processing"]["model"] == "fallback-opencv-pillow"

    job_id = payload["id"]

    result_response = client.get(f"/result/{job_id}")
    assert result_response.status_code == 200
    result_payload = result_response.json()
    assert result_payload["id"] == job_id
    assert result_payload["output"]["filename"].endswith(".png")
    assert result_payload["urls"]["download"] == f"/download/{job_id}"

    download_response = client.get(f"/download/{job_id}")
    assert download_response.status_code == 200
    assert download_response.headers["content-type"] == "image/png"
    assert len(download_response.content) > 0

    delete_response = client.delete(f"/result/{job_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "deleted"

    missing_response = client.get(f"/result/{job_id}")
    assert missing_response.status_code == 404


def test_process_rejects_unsupported_file(client: TestClient) -> None:
    response = client.post(
        "/process",
        files={"file": ("notes.txt", b"not an image", "text/plain")},
        data={"prefer_ai": "false", "mode": "enhance"},
    )

    assert response.status_code == 400
    assert "JPG/PNG/WebP" in response.json()["detail"]


def test_process_rejects_too_large_file(
    client: TestClient,
    test_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        main_module,
        "settings",
        replace(test_settings, max_upload_bytes=64),
    )

    response = client.post(
        "/process",
        files={"file": ("large.png", _make_image_bytes(fmt="PNG", size=(256, 256)), "image/png")},
        data={"prefer_ai": "false", "mode": "enhance"},
    )

    assert response.status_code == 413
    assert "слишком большой" in response.json()["detail"]
