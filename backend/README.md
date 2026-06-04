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
      colorization_processor.py
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
- `colorization_processor.py` подключает AI-колоризацию чёрно-белых фото через `OpenCV DNN`
- `model_loader.py` безопасно выбирает между AI-процессором и fallback
- `pipeline.py` вызывает runtime, не зная деталей конкретной модели

Если реальная модель отсутствует, backend не падает и продолжает работать через `fallback-opencv-pillow`.

## Поддерживаемые режимы

- `enhance`
- `restore`
- `denoise`
- `upscale`
- `colorize`

Реальные AI-сценарии подготовлены для `upscale` и `colorize`. Если нужная модель отсутствует, режим остается рабочим через fallback.

## AI и fallback

Backend всегда пытается сохранить рабочий пользовательский сценарий: если реальная AI-модель недоступна или режим не поддерживается AI-процессором, изображение обрабатывается через `fallback-opencv-pillow`.

Фактическое использование AI видно в ответе `POST /api/process`:

- `processing.used_ai = true` и `processing.model = "EDSR_x2.pb"` — использована модель super-resolution
- `processing.used_ai = true` и `processing.model = "colorization_release_v2.caffemodel"` — использована модель AI-колоризации
- `processing.used_ai = false` и `processing.model = "fallback-opencv-pillow"` — использована обработка через OpenCV/Pillow

На текущем этапе AI используется для режимов `upscale` и `colorize` при `prefer_ai=true` и наличии соответствующих model-файлов. Режимы `enhance`, `restore` и `denoise` остаются рабочими за счет fallback-обработки.

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

## Как подключить AI-колоризацию

По умолчанию backend ищет три файла модели здесь:

```text
backend/models/colorization_deploy_v2.prototxt
backend/models/colorization_release_v2.caffemodel
backend/models/pts_in_hull.npy
```

Если файлы лежат в другом месте, пути можно задать через переменные:

```powershell
$env:PHOTORESTORE_COLORIZATION_PROTO_PATH="C:\path\to\colorization_deploy_v2.prototxt"
$env:PHOTORESTORE_COLORIZATION_MODEL_PATH="C:\path\to\colorization_release_v2.caffemodel"
$env:PHOTORESTORE_COLORIZATION_POINTS_PATH="C:\path\to\pts_in_hull.npy"
```

Linux:

```bash
export PHOTORESTORE_COLORIZATION_PROTO_PATH=/var/www/project/backend/models/colorization_deploy_v2.prototxt
export PHOTORESTORE_COLORIZATION_MODEL_PATH=/var/www/project/backend/models/colorization_release_v2.caffemodel
export PHOTORESTORE_COLORIZATION_POINTS_PATH=/var/www/project/backend/models/pts_in_hull.npy
```

### Systemd

Для сервиса `ai-image-processing` можно добавить:

```ini
[Service]
Environment="PHOTORESTORE_AI_MODEL_PATH=/var/www/project/backend/models/EDSR_x2.pb"
Environment="PHOTORESTORE_COLORIZATION_PROTO_PATH=/var/www/project/backend/models/colorization_deploy_v2.prototxt"
Environment="PHOTORESTORE_COLORIZATION_MODEL_PATH=/var/www/project/backend/models/colorization_release_v2.caffemodel"
Environment="PHOTORESTORE_COLORIZATION_POINTS_PATH=/var/www/project/backend/models/pts_in_hull.npy"
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

Для строгой проверки обеих AI-моделей:

```powershell
python backend/scripts/check_model.py --require-all
```

Можно проверить отдельный режим:

```powershell
python backend/scripts/check_model.py --require upscale
python backend/scripts/check_model.py --require colorize
```

3. Проверить `GET /api/model/status`

Ожидаемо при успешной загрузке:

- `available = true`
- `model_file_exists = true`
- `ai_supported_modes` содержит `upscale` и/или `colorize`
- `ai_processors` содержит `ai-superres-opencv` и/или `ai-colorization-opencv`
- `active_processor = "ai-superres-opencv"` для одной модели или `active_processor = "ai-multi-opencv"` для нескольких AI-процессоров

4. Проверить `POST /api/process` с `mode=upscale` и `prefer_ai=true`

Ожидаемо:

- `processing.used_ai = true`
- `processing.model = "EDSR_x2.pb"`
- `output.width` и `output.height` примерно в 2 раза больше исходных

5. Проверить `POST /api/process` с `mode=colorize` и `prefer_ai=true` на чёрно-белом изображении

Ожидаемо при подключенной модели колоризации:

- `processing.used_ai = true`
- `processing.model = "colorization_release_v2.caffemodel"`

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
- что показывает `python backend/scripts/check_model.py --require-all`
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
- `active_processor = "ai-superres-opencv"` или `"ai-multi-opencv"`
- `ai_supported_modes` содержит доступные AI-режимы
- `model` содержит имя активной модели или список моделей
- `model_file_exists = true`

После деплоя изменений с лимитом AI-upscale нужно проверить два сценария:

- маленькое изображение, например `96x64`, в режиме `upscale` должно дать `processing.used_ai = true`
- изображение больше `512 * 512` пикселей в режиме `upscale` должно дать `processing.used_ai = false` и `processing.model = "fallback-opencv-pillow"`
- чёрно-белое изображение в режиме `colorize` при подключенной модели колоризации должно дать `processing.used_ai = true`

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
