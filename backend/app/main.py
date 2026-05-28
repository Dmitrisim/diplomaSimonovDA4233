from __future__ import annotations

import io
import json
import time
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

from .config import get_settings
from .processing.pipeline import process_image
from .storage import ensure_dirs, new_job_paths, safe_suffix

settings = get_settings()
ensure_dirs(settings.uploads_dir, settings.results_dir, settings.models_dir)

app = FastAPI(title="AI Image Processing System", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULT_SUFFIXES = (".png", ".jpg", ".jpeg", ".webp")

if settings.frontend_dist_dir.exists():
    assets_dir = settings.frontend_dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    if settings.frontend_dist_dir.exists():
        index_path = settings.frontend_dist_dir / "index.html"
        if index_path.exists():
            return index_path.read_text(encoding="utf-8")
    return """<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Image Processing</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 980px; margin: 24px auto; padding: 0 16px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { border: 1px solid #e5e5e5; border-radius: 10px; padding: 12px; }
    img { max-width: 100%; height: auto; display: block; border-radius: 8px; }
    button { padding: 10px 14px; border-radius: 10px; border: 1px solid #ccc; background: #111; color: #fff; cursor: pointer; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    .muted { color: #666; font-size: 14px; }
    input[type=file] { width: 100%; }
  </style>
  </head>
<body>
  <h1>Система обработки изображений</h1>
  <p class="muted">Загрузка → обработка → результат. AI-режим работает, если в папке backend/models есть файл EDSR_x2.pb.</p>

  <div class="card">
    <input id="file" type="file" accept="image/png,image/jpeg,image/webp" />
    <label class="muted"><input id="preferAi" type="checkbox" checked /> Предпочитать AI (если модель доступна)</label>
    <div style="margin-top: 10px;">
      <button id="run">Обработать</button>
      <span id="status" class="muted" style="margin-left: 10px;"></span>
    </div>
  </div>

  <div class="row" style="margin-top: 16px;">
    <div class="card">
      <h3>Исходное</h3>
      <img id="srcPreview" alt="" />
    </div>
    <div class="card">
      <h3>Результат</h3>
      <img id="dstPreview" alt="" />
      <div style="margin-top: 10px;">
        <a id="download" class="muted" href="#" download style="display:none;">Скачать результат</a>
      </div>
      <div id="meta" class="muted" style="margin-top: 8px;"></div>
    </div>
  </div>

  <script>
    const fileEl = document.getElementById('file');
    const runEl = document.getElementById('run');
    const statusEl = document.getElementById('status');
    const srcPreview = document.getElementById('srcPreview');
    const dstPreview = document.getElementById('dstPreview');
    const downloadEl = document.getElementById('download');
    const metaEl = document.getElementById('meta');
    const preferAiEl = document.getElementById('preferAi');

    fileEl.addEventListener('change', () => {
      const f = fileEl.files?.[0];
      if (!f) return;
      srcPreview.src = URL.createObjectURL(f);
      dstPreview.removeAttribute('src');
      downloadEl.style.display = 'none';
      metaEl.textContent = '';
      statusEl.textContent = '';
    });

    runEl.addEventListener('click', async () => {
      const f = fileEl.files?.[0];
      if (!f) { statusEl.textContent = 'Выберите файл.'; return; }
      runEl.disabled = true;
      statusEl.textContent = 'Обработка...';
      downloadEl.style.display = 'none';
      metaEl.textContent = '';
      try {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('prefer_ai', preferAiEl.checked ? 'true' : 'false');
        const resp = await fetch('/api/process', { method: 'POST', body: fd });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.detail || 'Ошибка');
        dstPreview.src = data.result_url;
        downloadEl.href = data.result_url;
        downloadEl.style.display = 'inline';
        metaEl.textContent = `used_ai=${data.used_ai}` + (data.model_name ? `, model=${data.model_name}` : '');
        statusEl.textContent = 'Готово.';
      } catch (e) {
        statusEl.textContent = e?.message || 'Ошибка';
      } finally {
        runEl.disabled = false;
      }
    });
  </script>
</body>
</html>"""


def _model_path() -> Path:
    return settings.models_dir / "EDSR_x2.pb"


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
    return settings.results_dir / f"{job_id}.json"


def _find_result_path(job_id: str) -> Path:
    for suffix in RESULT_SUFFIXES:
        candidate = settings.results_dir / f"{job_id}{suffix}"
        if candidate.exists() and candidate.is_file():
            return candidate
    raise HTTPException(status_code=404, detail="Результат не найден")


def _find_upload_path(job_id: str) -> Path | None:
    for suffix in RESULT_SUFFIXES:
        candidate = settings.uploads_dir / f"{job_id}{suffix}"
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


@app.get("/health")
@app.get("/api/health")
def health() -> dict:
    model_path = _model_path()
    return {
        "status": "ok",
        "service": "backend",
        "ai_model_present": model_path.exists(),
        "uploads_dir": str(settings.uploads_dir),
        "results_dir": str(settings.results_dir),
    }


@app.get("/model/status")
@app.get("/api/model/status")
def model_status() -> dict:
    model_path = _model_path()
    available = model_path.exists()
    return {
        "status": "ok",
        "available": available,
        "demo_mode": not available,
        "model_name": model_path.name if available else None,
        "framework": "opencv-pillow-fallback",
    }


@app.post("/process")
@app.post("/api/process")
async def process_endpoint(
    file: UploadFile = File(...),
    prefer_ai: str = Form("true"),
    mode: str = Form("enhance"),
) -> dict:
    suffix = safe_suffix(file.filename)
    if suffix == ".bin":
        raise HTTPException(status_code=400, detail="Поддерживаются только JPG/PNG/WebP")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Пустой файл")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Файл слишком большой")

    job = new_job_paths(settings.uploads_dir, settings.results_dir, upload_suffix=suffix, result_suffix=".png")
    job.upload_path.write_bytes(content)

    try:
        image = Image.open(io.BytesIO(content))
        image.load()
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Не удалось прочитать изображение")

    prefer_ai_bool = (prefer_ai or "").strip().lower() in {"1", "true", "yes", "on"}
    t0 = time.perf_counter()
    try:
        result = process_image(
            image=image,
            models_dir=settings.models_dir,
            prefer_ai=prefer_ai_bool,
            mode=mode,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Неподдерживаемый режим обработки")
    dt_ms = int((time.perf_counter() - t0) * 1000)
    result.image.save(job.result_path, format="PNG", optimize=True)

    in_w, in_h = image.size
    out_w, out_h = result.image.size

    payload = _build_job_payload(
        job_id=job.job_id,
        source_name=file.filename or job.upload_path.name,
        source_format=suffix.lstrip("."),
        source_size=len(content),
        source_width=in_w,
        source_height=in_h,
        result_path=job.result_path,
        result_format="png",
        result_width=out_w,
        result_height=out_h,
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


@app.get("/result/{job_id}")
@app.get("/api/result/{job_id}")
def result_info(job_id: str) -> dict:
    return _load_job_metadata(job_id)


@app.get("/download/{job_id}")
@app.get("/api/download/{job_id}")
def download_result(job_id: str, inline: bool = Query(False)) -> FileResponse:
    path = _find_result_path(job_id)
    filename = path.name if inline else f"{job_id}{path.suffix}"
    content_disposition_type = "inline" if inline else "attachment"
    return FileResponse(
        path,
        filename=filename,
        content_disposition_type=content_disposition_type,
    )


@app.get("/api/result/file/{name}")
def legacy_result_file(name: str) -> FileResponse:
    path = settings.results_dir / name
    if not path.exists() or path.is_dir():
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(path)


@app.delete("/result/{job_id}")
@app.delete("/api/result/{job_id}")
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


@app.get("/favicon.svg")
def favicon_file() -> FileResponse:
    path = settings.frontend_dist_dir / "favicon.svg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(path)


@app.get("/icons.svg")
def icons_file() -> FileResponse:
    path = settings.frontend_dist_dir / "icons.svg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(path)


@app.get("/{full_path:path}", response_class=HTMLResponse)
def spa_fallback(full_path: str) -> str:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Маршрут не найден")
    index_path = settings.frontend_dist_dir / "index.html"
    if index_path.exists():
        return index_path.read_text(encoding="utf-8")
    raise HTTPException(status_code=404, detail="Фронтенд не собран")
