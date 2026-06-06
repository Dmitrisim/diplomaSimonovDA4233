from __future__ import annotations

import io
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image
import pytest

from backend.app import config as config_module
from backend.app import main as main_module
from backend.app.config import Settings
from backend.app.inference import AI_MODEL_PATH_ENV, ImageProcessor, InferenceResult, ProcessorRuntime, load_processor_runtime
from backend.app.processing import pipeline as pipeline_module
from backend.app.storage import ensure_dirs


def _make_image_bytes(fmt: str = "JPEG", size: tuple[int, int] = (96, 64)) -> bytes:
    image = Image.new("RGB", size, color=(180, 140, 90))
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return buffer.getvalue()


class _MockAiProcessor(ImageProcessor):
    name = "ai-superres-opencv"
    framework = "opencv-dnn-superres"
    supported_modes = ("upscale",)
    model_name = "EDSR_x2.pb"

    def process(
        self,
        *,
        image: Image.Image,
        mode: str = "enhance",
        prefer_ai: bool = True,
        upscale_scale: int = 2,
        max_width: int | None = None,
        max_height: int | None = None,
    ) -> InferenceResult:
        del prefer_ai
        del upscale_scale
        del max_width
        del max_height
        if mode != "upscale":
            raise ValueError("unsupported_mode")
        output = image.resize((image.width * 2, image.height * 2))
        return InferenceResult(
            image=output,
            used_ai=True,
            model_name="EDSR_x2.pb",
            mode="upscale",
        )


class _MockColorizationAiProcessor(ImageProcessor):
    name = "ai-colorization-opencv"
    framework = "opencv-dnn-colorization"
    supported_modes = ("colorize",)
    model_name = "colorization_release_v2.caffemodel"

    def process(
        self,
        *,
        image: Image.Image,
        mode: str = "enhance",
        prefer_ai: bool = True,
        upscale_scale: int = 2,
        max_width: int | None = None,
        max_height: int | None = None,
    ) -> InferenceResult:
        del prefer_ai
        del upscale_scale
        del max_width
        del max_height
        if mode != "colorize":
            raise ValueError("unsupported_mode")
        output = image.convert("L").convert("RGB")
        return InferenceResult(
            image=output,
            used_ai=True,
            model_name="colorization_release_v2.caffemodel",
            mode="colorize",
        )


class _MockFallbackProcessor(ImageProcessor):
    name = "fallback-opencv-pillow"
    framework = "opencv-pillow-fallback"
    supported_modes = ("enhance", "restore", "denoise", "upscale", "colorize", "web")

    def process(
        self,
        *,
        image: Image.Image,
        mode: str = "enhance",
        prefer_ai: bool = True,
        upscale_scale: int = 2,
        max_width: int | None = None,
        max_height: int | None = None,
    ) -> InferenceResult:
        del prefer_ai
        del upscale_scale
        del max_width
        del max_height
        return InferenceResult(
            image=image,
            used_ai=False,
            model_name="fallback-opencv-pillow",
            mode=(mode or "").strip().lower(),
        )


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
        max_ai_upscale_pixels=512 * 512,
        cors_origins=("http://127.0.0.1:5173", "http://localhost:5173"),
    )
    monkeypatch.delenv(AI_MODEL_PATH_ENV, raising=False)
    ensure_dirs(
        settings.backend_dir,
        settings.storage_dir,
        settings.uploads_dir,
        settings.results_dir,
        settings.models_dir,
        settings.frontend_dist_dir,
    )
    monkeypatch.setattr(config_module, "get_settings", lambda: settings)
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
    assert payload["service"] == "backend"
    assert "available" in payload
    assert payload["available"] is False
    assert payload["active_processor"] == "fallback-opencv-pillow"
    assert payload["default_processor"] == "fallback-opencv-pillow"
    assert payload["model"] == "fallback-opencv-pillow"
    assert payload["model_name"] is None
    assert payload["model_path"].endswith("EDSR_x2.pb")
    assert payload["model_file_exists"] is False
    assert payload["availability_reason"] == "AI model path not configured"
    assert payload["supported_modes"] == ["enhance", "restore", "denoise", "upscale", "colorize", "web"]
    assert payload["ai_supported_modes"] == []
    assert payload["ai_processors"] == []
    assert payload["fallback_available"] is True
    assert payload["modes"] == ["enhance", "restore", "denoise", "upscale", "colorize", "web"]
    assert payload["framework"] == "opencv-pillow-fallback"


def test_model_loader_returns_fallback_when_model_missing(
    test_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    missing_model_path = tmp_path / "missing" / "EDSR_x2.pb"
    monkeypatch.setenv(AI_MODEL_PATH_ENV, str(missing_model_path))

    runtime = load_processor_runtime(test_settings.models_dir)

    assert runtime.available is False
    assert runtime.active_processor == "fallback-opencv-pillow"
    assert runtime.model == "fallback-opencv-pillow"
    assert runtime.model_path == str(missing_model_path)
    assert runtime.model_file_exists is False
    assert runtime.availability_reason == "AI model file not found"
    assert runtime.fallback_available is True


def test_model_loader_supports_relative_path_inside_backend_models(
    test_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(AI_MODEL_PATH_ENV, "relative-model.pb")

    runtime = load_processor_runtime(test_settings.models_dir)

    assert runtime.model_path == str(test_settings.models_dir / "relative-model.pb")
    assert runtime.model_file_exists is False
    assert runtime.availability_reason == "AI model file not found"


def test_model_loader_supports_relative_path_from_project_root(
    test_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(AI_MODEL_PATH_ENV, "backend/models/root-relative.pb")

    runtime = load_processor_runtime(test_settings.models_dir)

    assert runtime.model_path == str(test_settings.project_root / "backend" / "models" / "root-relative.pb")
    assert runtime.model_file_exists is False
    assert runtime.availability_reason == "AI model file not found"


def test_model_status_explains_missing_model_file(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    missing_model_path = tmp_path / "custom" / "EDSR_x2.pb"
    monkeypatch.setenv(AI_MODEL_PATH_ENV, str(missing_model_path))

    response = client.get("/api/model/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["available"] is False
    assert payload["active_processor"] == "fallback-opencv-pillow"
    assert payload["model_file_exists"] is False
    assert payload["model_path"] == str(missing_model_path)
    assert payload["availability_reason"] == "AI model file not found"
    assert payload["fallback_available"] is True


def test_process_result_download_delete_cycle_jpg(client: TestClient) -> None:
    image_bytes = _make_image_bytes(fmt="JPEG")

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
    assert result_payload["urls"]["source"] == f"/source/{job_id}"
    assert result_payload["urls"]["download"] == f"/download/{job_id}"

    source_response = client.get(f"/source/{job_id}")
    assert source_response.status_code == 200
    assert source_response.headers["content-type"] == "image/jpeg"
    assert len(source_response.content) > 0

    download_response = client.get(f"/download/{job_id}")
    assert download_response.status_code == 200
    assert download_response.headers["content-type"] == "image/png"
    assert len(download_response.content) > 0

    delete_response = client.delete(f"/result/{job_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "deleted"

    missing_response = client.get(f"/result/{job_id}")
    assert missing_response.status_code == 404


def test_process_png_restore_mode(client: TestClient) -> None:
    process_response = client.post(
        "/process",
        files={"file": ("restore.png", _make_image_bytes(fmt="PNG"), "image/png")},
        data={"prefer_ai": "true", "mode": "restore"},
    )

    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload["input"]["format"] == "PNG"
    assert payload["processing"]["mode"] == "restore"
    assert payload["processing"]["used_ai"] is False
    assert payload["processing"]["model"] == "fallback-opencv-pillow"
    assert payload["output"]["format"] == "PNG"


def test_process_denoise_mode(client: TestClient) -> None:
    process_response = client.post(
        "/api/process",
        files={"file": ("noisy.png", _make_image_bytes(fmt="PNG"), "image/png")},
        data={"prefer_ai": "true", "mode": "denoise"},
    )

    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload["processing"]["mode"] == "denoise"
    assert payload["processing"]["used_ai"] is False
    assert payload["processing"]["model"] == "fallback-opencv-pillow"
    assert payload["output"]["format"] == "PNG"


def test_process_web_mode_exports_jpeg_with_target_size(client: TestClient) -> None:
    process_response = client.post(
        "/api/process",
        files={"file": ("web.jpg", _make_image_bytes(fmt="JPEG", size=(320, 240)), "image/jpeg")},
        data={
            "prefer_ai": "false",
            "mode": "web",
            "result_format": "jpeg",
            "quality": "72",
            "max_width": "80",
            "max_height": "60",
            "optimize_file_size": "true",
        },
    )

    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload["processing"]["mode"] == "web"
    assert payload["processing"]["used_ai"] is False
    assert payload["output"]["format"] == "JPEG"
    assert payload["output"]["filename"].endswith(".jpg")
    assert payload["output"]["width"] <= 80
    assert payload["output"]["height"] <= 60

    download_response = client.get(payload["urls"]["download"])
    assert download_response.status_code == 200
    assert download_response.headers["content-type"] == "image/jpeg"


def test_process_upscale_changes_dimensions(client: TestClient) -> None:
    process_response = client.post(
        "/api/process",
        files={"file": ("upscale.jpg", _make_image_bytes(fmt="JPEG", size=(64, 48)), "image/jpeg")},
        data={"prefer_ai": "true", "mode": "upscale"},
    )

    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload["processing"]["mode"] == "upscale"
    assert payload["processing"]["used_ai"] is False
    assert payload["processing"]["model"] == "fallback-opencv-pillow"
    assert payload["output"]["width"] == 128
    assert payload["output"]["height"] == 96


def test_process_upscale_uses_ai_when_runtime_is_available(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime = ProcessorRuntime(
        ai_processor=_MockAiProcessor(),
        fallback_processor=_MockFallbackProcessor(),
        available=True,
        active_processor="ai-superres-opencv",
        default_processor="ai-superres-opencv",
        model="EDSR_x2.pb",
        model_name="EDSR_x2.pb",
        framework="opencv-dnn-superres",
        model_path="C:/fake/EDSR_x2.pb",
        model_file_exists=True,
        availability_reason=None,
        supported_modes=("enhance", "restore", "denoise", "upscale", "colorize", "web"),
        fallback_available=True,
    )
    monkeypatch.setattr(pipeline_module, "load_processor_runtime", lambda _: runtime)

    process_response = client.post(
        "/api/process",
        files={"file": ("ai-upscale.jpg", _make_image_bytes(fmt="JPEG", size=(64, 48)), "image/jpeg")},
        data={"prefer_ai": "true", "mode": "upscale"},
    )

    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload["processing"]["mode"] == "upscale"
    assert payload["processing"]["used_ai"] is True
    assert payload["processing"]["model"] == "EDSR_x2.pb"
    assert payload["output"]["width"] == 128
    assert payload["output"]["height"] == 96


def test_process_upscale_uses_fallback_when_image_exceeds_ai_limit(
    client: TestClient,
    test_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    limited_settings = Settings(
        project_root=test_settings.project_root,
        backend_dir=test_settings.backend_dir,
        storage_dir=test_settings.storage_dir,
        uploads_dir=test_settings.uploads_dir,
        results_dir=test_settings.results_dir,
        models_dir=test_settings.models_dir,
        frontend_dist_dir=test_settings.frontend_dist_dir,
        max_upload_bytes=test_settings.max_upload_bytes,
        max_ai_upscale_pixels=16 * 16,
        cors_origins=test_settings.cors_origins,
    )
    runtime = ProcessorRuntime(
        ai_processor=_MockAiProcessor(),
        fallback_processor=_MockFallbackProcessor(),
        available=True,
        active_processor="ai-superres-opencv",
        default_processor="ai-superres-opencv",
        model="EDSR_x2.pb",
        model_name="EDSR_x2.pb",
        framework="opencv-dnn-superres",
        model_path="C:/fake/EDSR_x2.pb",
        model_file_exists=True,
        availability_reason=None,
        supported_modes=("enhance", "restore", "denoise", "upscale", "colorize", "web"),
        fallback_available=True,
    )
    monkeypatch.setattr(config_module, "get_settings", lambda: limited_settings)
    monkeypatch.setattr(pipeline_module, "load_processor_runtime", lambda _: runtime)

    process_response = client.post(
        "/api/process",
        files={"file": ("large-for-ai.jpg", _make_image_bytes(fmt="JPEG", size=(64, 48)), "image/jpeg")},
        data={"prefer_ai": "true", "mode": "upscale"},
    )

    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload["processing"]["mode"] == "upscale"
    assert payload["processing"]["used_ai"] is False
    assert payload["processing"]["model"] == "fallback-opencv-pillow"


def test_process_colorize_returns_result(client: TestClient) -> None:
    process_response = client.post(
        "/api/process",
        files={"file": ("mono.png", _make_image_bytes(fmt="PNG"), "image/png")},
        data={"prefer_ai": "false", "mode": "colorize"},
    )

    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload["processing"]["mode"] == "colorize"
    assert payload["processing"]["used_ai"] is False
    assert payload["processing"]["model"] == "fallback-opencv-pillow"


def test_process_colorize_uses_ai_when_runtime_is_available(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime = ProcessorRuntime(
        ai_processor=_MockColorizationAiProcessor(),
        fallback_processor=_MockFallbackProcessor(),
        available=True,
        active_processor="ai-colorization-opencv",
        default_processor="ai-colorization-opencv",
        model="colorization_release_v2.caffemodel",
        model_name="colorization_release_v2.caffemodel",
        framework="opencv-dnn-colorization",
        model_path="C:/fake/colorization_release_v2.caffemodel",
        model_file_exists=True,
        availability_reason=None,
        supported_modes=("enhance", "restore", "denoise", "upscale", "colorize", "web"),
        ai_supported_modes=("colorize",),
        ai_processors=("ai-colorization-opencv",),
        fallback_available=True,
    )
    monkeypatch.setattr(pipeline_module, "load_processor_runtime", lambda _: runtime)

    process_response = client.post(
        "/api/process",
        files={"file": ("mono.png", _make_image_bytes(fmt="PNG"), "image/png")},
        data={"prefer_ai": "true", "mode": "colorize"},
    )

    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload["processing"]["mode"] == "colorize"
    assert payload["processing"]["used_ai"] is True
    assert payload["processing"]["model"] == "colorization_release_v2.caffemodel"


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
    smaller_settings = Settings(
        project_root=test_settings.project_root,
        backend_dir=test_settings.backend_dir,
        storage_dir=test_settings.storage_dir,
        uploads_dir=test_settings.uploads_dir,
        results_dir=test_settings.results_dir,
        models_dir=test_settings.models_dir,
        frontend_dist_dir=test_settings.frontend_dist_dir,
        max_upload_bytes=64,
        max_ai_upscale_pixels=test_settings.max_ai_upscale_pixels,
        cors_origins=test_settings.cors_origins,
    )
    monkeypatch.setattr(config_module, "get_settings", lambda: smaller_settings)

    response = client.post(
        "/process",
        files={"file": ("large.png", _make_image_bytes(fmt="PNG", size=(256, 256)), "image/png")},
        data={"prefer_ai": "false", "mode": "enhance"},
    )

    assert response.status_code == 413
    assert "слишком большой" in response.json()["detail"]
