# PhotoRestore AI Backend

Backend построен на `FastAPI` и разделен на слои, чтобы сохранить стабильный API-контракт и отдельно развивать inference-часть.

## Структура

```text
backend/
  app/
    api/
      routes.py
    inference/
      base.py
      fallback.py
      ai_processor.py
      model_loader.py
    processing/
      filters.py
      pipeline.py
    config.py
    main.py
    schemas.py
    storage.py
  models/
    README.md
  scripts/
    check_model.py
  tests/
    test_api.py
```

## Inference Layer

- `fallback.py` содержит стабильную обработку через `OpenCV + Pillow`
- `ai_processor.py` подключает реальный `EDSR_x2.pb` для сценария `super-resolution / upscale`
- `model_loader.py` безопасно выбирает между AI-процессором и fallback
- `pipeline.py` вызывает runtime, не зная деталей конкретной модели

Если реальная модель отсутствует, backend не падает и продолжает работать через `fallback-opencv-pillow`.

## Поддерживаемые режимы

- `enhance`
- `restore`
- `upscale`
- `colorize`

Сейчас реальный AI-сценарий подготовлен для `upscale`. Остальные режимы обрабатываются через fallback.

## AI и fallback

Backend всегда пытается сохранить рабочий пользовательский сценарий: если реальная AI-модель недоступна или режим не поддерживается AI-процессором, изображение обрабатывается через `fallback-opencv-pillow`.

Фактическое использование AI видно в ответе `POST /api/process`:

- `processing.used_ai = true` и `processing.model = "EDSR_x2.pb"` — использована модель super-resolution
- `processing.used_ai = false` и `processing.model = "fallback-opencv-pillow"` — использована обработка через OpenCV/Pillow

На текущем этапе AI используется только для режима `upscale` при `prefer_ai=true`. Режимы `enhance`, `restore` и `colorize` остаются рабочими за счет fallback-обработки.

## Лимит для AI-upscale

Для защиты VPS от нехватки памяти в `Settings` задан лимит:

```text
max_ai_upscale_pixels = 512 * 512
```

Если пользователь отправляет изображение в режиме `upscale` с `prefer_ai=true`, но размер исходника больше этого лимита, backend не запускает `EDSR_x2.pb` и автоматически переключается на fallback. Контракт ответа не меняется: пользователь получает результат, а в блоке `processing` видно, что использовался `fallback-opencv-pillow`.

Это поведение нужно для стабильности сервера: большие изображения могут требовать слишком много RAM при super-resolution.

## Установка

Из корня проекта:

```powershell
python -m pip install -r backend/requirements.txt
```

## Локальный запуск backend

```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload
```

## Endpoints

- `GET /health`
- `GET /api/health`
- `GET /model/status`
- `GET /api/model/status`
- `POST /process`
- `POST /api/process`
- `GET /result/{id}`
- `GET /api/result/{id}`
- `GET /download/{id}`
- `GET /api/download/{id}`
- `DELETE /result/{id}`
- `DELETE /api/result/{id}`

## Контракт `POST /process`

Контракт сохранен для frontend:

```json
{
  "id": "uuid",
  "status": "completed",
  "message": "Изображение успешно обработано",
  "input": {
    "filename": "image.jpg",
    "format": "JPEG",
    "size_bytes": 12345,
    "width": 1200,
    "height": 800
  },
  "output": {
    "filename": "uuid.png",
    "format": "PNG",
    "size_bytes": 23456,
    "width": 2400,
    "height": 1600
  },
  "processing": {
    "mode": "upscale",
    "used_ai": true,
    "model": "EDSR_x2.pb",
    "time_ms": 1234
  },
  "urls": {
    "result": "/result/{id}",
    "download": "/download/{id}"
  }
}
```

## Как подключить `EDSR_x2.pb`

По умолчанию backend ищет модель здесь:

```text
backend/models/EDSR_x2.pb
```

Если модель лежит в другом месте, можно задать путь через `PHOTORESTORE_AI_MODEL_PATH`.

Windows PowerShell:

```powershell
$env:PHOTORESTORE_AI_MODEL_PATH="C:\path\to\EDSR_x2.pb"
```

Linux:

```bash
export PHOTORESTORE_AI_MODEL_PATH=/var/www/project/backend/models/EDSR_x2.pb
```

### Systemd

Для сервиса `ai-image-processing` можно добавить:

```ini
[Service]
Environment="PHOTORESTORE_AI_MODEL_PATH=/var/www/project/backend/models/EDSR_x2.pb"
```

После изменения:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ai-image-processing
```

## Как проверить, что модель активна

1. Положить настоящий файл `EDSR_x2.pb`
2. Выполнить:

```powershell
python backend/scripts/check_model.py
```

3. Проверить `GET /api/model/status`

Ожидаемо при успешной загрузке:

- `available = true`
- `model_file_exists = true`
- `active_processor = "ai-superres-opencv"`
- `framework = "opencv-dnn-superres"`

4. Проверить `POST /api/process` с `mode=upscale` и `prefer_ai=true`

Ожидаемо:

- `processing.used_ai = true`
- `processing.model = "EDSR_x2.pb"`
- `output.width` и `output.height` примерно в 2 раза больше исходных

Для проверки защитного лимита можно отправить изображение больше `512 * 512` пикселей с `mode=upscale` и `prefer_ai=true`. Ожидаемо:

- `processing.used_ai = false`
- `processing.model = "fallback-opencv-pillow"`
- backend продолжает работать и возвращает результат

## Если модель не загрузилась

Проверь:

- существует ли файл по ожидаемому пути
- правильно ли задан `PHOTORESTORE_AI_MODEL_PATH`
- доступен ли `cv2.dnn_superres`
- что показывает `python backend/scripts/check_model.py`
- что возвращает `GET /api/model/status`

Если модель не найдена или не инициализируется, backend честно сообщит причину в `availability_reason` и продолжит работу через fallback.

## Проверка production

На сервере Beget/VPS основной сайт доступен по адресу:

```text
http://212.67.12.19/
```

Базовая проверка backend:

```powershell
Invoke-RestMethod -Uri "http://212.67.12.19/api/health"
Invoke-RestMethod -Uri "http://212.67.12.19/api/model/status"
```

При активной AI-модели `/api/model/status` должен показывать:

- `available = true`
- `active_processor = "ai-superres-opencv"`
- `model = "EDSR_x2.pb"`
- `model_file_exists = true`

После деплоя изменений с лимитом AI-upscale нужно проверить два сценария:

- маленькое изображение, например `96x64`, в режиме `upscale` должно дать `processing.used_ai = true`
- изображение больше `512 * 512` пикселей в режиме `upscale` должно дать `processing.used_ai = false` и `processing.model = "fallback-opencv-pillow"`

## Обновление сервера

Обычный порядок обновления production:

1. Локально внести изменения в проект.
2. Сделать commit и push через GitHub Desktop или git.
3. Подключиться к серверу по SSH.
4. В каталоге `/opt/ai-image-processing` выполнить:

```bash
./deploy/quick-update.sh
```

Скрипт подтягивает изменения, пересобирает frontend и перезапускает сервис `ai-image-processing.service`.

## Тесты

```powershell
python -m pytest backend/tests -q -rA
```

## Frontend Build

```powershell
cd frontend
npm run build
```
