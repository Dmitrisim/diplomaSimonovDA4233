from __future__ import annotations

import io
import json
import time
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError

from .. import config
from ..processing.pipeline import get_processor_runtime, process_image
from ..schemas import DeleteResultResponse, HealthResponse, ModelStatusResponse, ProcessResponse
from ..storage import ensure_dirs, new_job_paths, safe_suffix

router = APIRouter()

RESULT_SUFFIXES = (".png", ".jpg", ".jpeg", ".webp")


def _settings() -> config.Settings:
    return config.get_settings()


def _normalize_image_format(value: str | None) -> str:
    if not value:
        return "PNG"
    normalized = value.strip().lower()
    if normalized in {"jpg", "jpeg"}:
        return "JPEG"
    if normalized == "png":
        return "PNG"
    if normalized == "webp":
        return "WebP"
    return normalized.upper()


def _metadata_path(job_id: str) -> Path:
    return _settings().results_dir / f"{job_id}.json"


def _find_result_path(job_id: str) -> Path:
    results_dir = _settings().results_dir
    for suffix in RESULT_SUFFIXES:
        candidate = results_dir / f"{job_id}{suffix}"
        if candidate.exists() and candidate.is_file():
            return candidate
    raise HTTPException(status_code=404, detail="Результат не найден")


def _find_upload_path(job_id: str) -> Path | None:
    uploads_dir = _settings().uploads_dir
    for suffix in RESULT_SUFFIXES:
        candidate = uploads_dir / f"{job_id}{suffix}"
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def _build_job_payload(
    *,
    job_id: str,
    source_name: str,
    source_format: str,
    source_size: int,
    source_width: int,
    source_height: int,
    result_path: Path,
    result_format: str,
    result_width: int,
    result_height: int,
    mode: str,
    used_ai: bool,
    model_name: str | None,
    timing_ms: int,
) -> dict:
    return {
        "id": job_id,
        "status": "completed",
        "message": "Изображение успешно обработано",
        "created_at": int(time.time()),
        "input": {
            "filename": source_name,
            "format": _normalize_image_format(source_format),
            "size_bytes": source_size,
            "width": source_width,
            "height": source_height,
        },
        "output": {
            "filename": result_path.name,
            "format": _normalize_image_format(result_format),
            "size_bytes": result_path.stat().st_size,
            "width": result_width,
            "height": result_height,
        },
        "processing": {
            "mode": mode,
            "used_ai": used_ai,
            "model": model_name or "fallback-opencv-pillow",
            "time_ms": timing_ms,
        },
        "urls": {
            "result": f"/result/{job_id}",
            "download": f"/download/{job_id}",
        },
    }


def _save_job_metadata(job_id: str, payload: dict) -> None:
    _metadata_path(job_id).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _load_job_metadata(job_id: str) -> dict:
    metadata_path = _metadata_path(job_id)
    if metadata_path.exists() and metadata_path.is_file():
        return json.loads(metadata_path.read_text(encoding="utf-8"))

    result_path = _find_result_path(job_id)
    return {
        "id": job_id,
        "status": "completed",
        "message": "Изображение успешно обработано",
        "created_at": None,
        "input": {
            "filename": None,
            "format": None,
            "size_bytes": None,
            "width": None,
            "height": None,
        },
        "output": {
            "filename": result_path.name,
            "format": _normalize_image_format(result_path.suffix.lstrip(".")),
            "size_bytes": result_path.stat().st_size,
            "width": None,
            "height": None,
        },
        "processing": {
            "mode": "unknown",
            "used_ai": False,
            "model": "fallback-opencv-pillow",
            "time_ms": None,
        },
        "urls": {
            "result": f"/result/{job_id}",
            "download": f"/download/{job_id}",
        },
    }


@router.get("/health", response_model=HealthResponse)
@router.get("/api/health", response_model=HealthResponse)
def health() -> dict:
    settings = _settings()
    runtime = get_processor_runtime(settings.models_dir)
    return {
        "status": "ok",
        "service": "backend",
        "ai_model_present": runtime.available,
        "uploads_dir": str(settings.uploads_dir),
        "results_dir": str(settings.results_dir),
    }


@router.get("/model/status", response_model=ModelStatusResponse)
@router.get("/api/model/status", response_model=ModelStatusResponse)
def model_status() -> dict:
    settings = _settings()
    runtime = get_processor_runtime(settings.models_dir)
    supported_modes = list(runtime.supported_modes)
    return {
        "status": "ok",
        "service": "backend",
        "available": runtime.available,
        "demo_mode": not runtime.available,
        "default_processor": runtime.default_processor,
        "active_processor": runtime.active_processor,
        "model": runtime.model,
        "model_name": runtime.model_name,
        "framework": runtime.framework,
        "model_path": runtime.model_path,
        "model_file_exists": runtime.model_file_exists,
        "availability_reason": runtime.availability_reason,
        "supported_modes": supported_modes,
        "ai_supported_modes": list(runtime.ai_supported_modes),
        "ai_processors": list(runtime.ai_processors),
        "fallback_available": runtime.fallback_available,
        "modes": supported_modes,
    }


@router.post("/process", response_model=ProcessResponse)
@router.post("/api/process", response_model=ProcessResponse)
async def process_endpoint(
    file: UploadFile = File(...),
    prefer_ai: str = Form("true"),
    mode: str = Form("enhance"),
) -> dict:
    settings = _settings()
    ensure_dirs(settings.uploads_dir, settings.results_dir, settings.models_dir)

    suffix = safe_suffix(file.filename)
    if suffix == ".bin":
        raise HTTPException(status_code=400, detail="Поддерживаются только JPG/PNG/WebP")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Пустой файл")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Файл слишком большой")

    job = new_job_paths(
        settings.uploads_dir,
        settings.results_dir,
        upload_suffix=suffix,
        result_suffix=".png",
    )
    job.upload_path.write_bytes(content)

    try:
        image = Image.open(io.BytesIO(content))
        image.load()
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Не удалось прочитать изображение") from exc

    prefer_ai_bool = (prefer_ai or "").strip().lower() in {"1", "true", "yes", "on"}
    mode_norm = (mode or "").strip().lower()
    if (
        prefer_ai_bool
        and mode_norm == "upscale"
        and image.width * image.height > settings.max_ai_upscale_pixels
    ):
        prefer_ai_bool = False

    t0 = time.perf_counter()
    try:
        result = process_image(
            image=image,
            models_dir=settings.models_dir,
            prefer_ai=prefer_ai_bool,
            mode=mode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Неподдерживаемый режим обработки") from exc

    dt_ms = int((time.perf_counter() - t0) * 1000)
    result.image.save(job.result_path, format="PNG", optimize=True)

    in_width, in_height = image.size
    out_width, out_height = result.image.size

    payload = _build_job_payload(
        job_id=job.job_id,
        source_name=file.filename or job.upload_path.name,
        source_format=suffix.lstrip("."),
        source_size=len(content),
        source_width=in_width,
        source_height=in_height,
        result_path=job.result_path,
        result_format="png",
        result_width=out_width,
        result_height=out_height,
        mode=result.mode,
        used_ai=result.used_ai,
        model_name=result.model_name,
        timing_ms=dt_ms,
    )
    _save_job_metadata(job.job_id, payload)

    return {
        "id": job.job_id,
        "status": payload["status"],
        "message": payload["message"],
        "input": payload["input"],
        "output": payload["output"],
        "processing": payload["processing"],
        "urls": payload["urls"],
    }


@router.get("/result/{job_id}")
@router.get("/api/result/{job_id}")
def result_info(job_id: str) -> dict:
    return _load_job_metadata(job_id)


@router.get("/download/{job_id}")
@router.get("/api/download/{job_id}")
def download_result(job_id: str, inline: bool = Query(False)) -> FileResponse:
    path = _find_result_path(job_id)
    filename = path.name if inline else f"{job_id}{path.suffix}"
    content_disposition_type = "inline" if inline else "attachment"
    return FileResponse(
        path,
        filename=filename,
        content_disposition_type=content_disposition_type,
    )


@router.get("/api/result/file/{name}")
def legacy_result_file(name: str) -> FileResponse:
    path = _settings().results_dir / name
    if not path.exists() or path.is_dir():
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(path)


@router.delete("/result/{job_id}", response_model=DeleteResultResponse)
@router.delete("/api/result/{job_id}", response_model=DeleteResultResponse)
def delete_result(job_id: str) -> dict:
    deleted: list[str] = []

    metadata_path = _metadata_path(job_id)
    if metadata_path.exists():
        metadata_path.unlink()
        deleted.append(metadata_path.name)

    try:
        result_path = _find_result_path(job_id)
    except HTTPException:
        result_path = None

    if result_path is not None and result_path.exists():
        result_path.unlink()
        deleted.append(result_path.name)

    upload_path = _find_upload_path(job_id)
    if upload_path is not None and upload_path.exists():
        upload_path.unlink()
        deleted.append(upload_path.name)

    if not deleted:
        raise HTTPException(status_code=404, detail="Результат не найден")

    return {"status": "deleted", "id": job_id, "deleted_files": deleted}
