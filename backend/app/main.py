from __future__ import annotations

import io
import time
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

from .config import get_settings
from .processing.pipeline import process_image
from .storage import ensure_dirs, new_job_paths, safe_suffix

settings = get_settings()
ensure_dirs(settings.uploads_dir, settings.results_dir, settings.models_dir)

app = FastAPI(title="AI Image Processing System", version="0.1.0")

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


@app.get("/api/health")
def health() -> dict:
    model_path = settings.models_dir / "EDSR_x2.pb"
    return {"status": "ok", "ai_model_present": model_path.exists()}


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

    return {
        "job_id": job.job_id,
        "used_ai": result.used_ai,
        "model_name": result.model_name,
        "mode": result.mode,
        "timing_ms": dt_ms,
        "input": {"width": in_w, "height": in_h, "bytes": len(content)},
        "output": {"width": out_w, "height": out_h, "bytes": job.result_path.stat().st_size},
        "result_url": f"/api/result/{job.job_id}.png",
    }


@app.get("/api/result/{name}")
def result_file(name: str) -> FileResponse:
    path = settings.results_dir / name
    if not path.exists() or path.is_dir():
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(path)


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
