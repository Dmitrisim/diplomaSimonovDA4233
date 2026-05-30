from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from .api import router as api_router
from .config import get_settings
from .inference import log_processor_runtime_status
from .storage import ensure_dirs

settings = get_settings()
ensure_dirs(settings.uploads_dir, settings.results_dir, settings.models_dir)


@asynccontextmanager
async def lifespan(_: FastAPI):
    log_processor_runtime_status(settings.models_dir)
    yield


app = FastAPI(title="AI Image Processing System", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.frontend_dist_dir.exists():
    assets_dir = settings.frontend_dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

app.include_router(api_router)


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
  <p class="muted">Backend работает через inference layer. Пока используется fallback `opencv-pillow`.</p>

  <div class="card">
    <input id="file" type="file" accept="image/png,image/jpeg,image/webp" />
    <label class="muted"><input id="preferAi" type="checkbox" checked /> Предпочитать AI (когда реальная модель будет подключена)</label>
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
        dstPreview.src = data.urls.download + '?inline=true';
        downloadEl.href = data.urls.download;
        downloadEl.style.display = 'inline';
        metaEl.textContent = `used_ai=${data.processing.used_ai}, model=${data.processing.model}`;
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
