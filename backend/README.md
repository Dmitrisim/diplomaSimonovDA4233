# Backend API

Минимальный backend для сервиса обработки изображений `Artful / AI Image Processing`.

## Что сейчас делает backend

- принимает изображение от frontend;
- валидирует формат и размер файла;
- сохраняет исходный файл в `storage/uploads/`;
- запускает fallback-обработку через `Pillow + OpenCV`;
- сохраняет результат в `storage/results/`;
- отдает metadata, файл результата и позволяет удалить job.

На текущем этапе полноценная `PyTorch`-модель не подключена. Если AI-модель отсутствует, backend работает в fallback-режиме `opencv-pillow`.

## Установка зависимостей

Из корня проекта:

```bash
python -m pip install -r backend/requirements.txt
```

## Запуск backend

Из корня проекта:

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload
```

## Основные endpoints

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

## Формат ответа `POST /process`

```json
{
  "id": "uuid",
  "status": "completed",
  "message": "Изображение успешно обработано",
  "input": {
    "filename": "original.jpg",
    "format": "JPEG",
    "size_bytes": 123456,
    "width": 1200,
    "height": 800
  },
  "output": {
    "filename": "result.png",
    "format": "PNG",
    "size_bytes": 654321,
    "width": 1200,
    "height": 800
  },
  "processing": {
    "mode": "enhance",
    "used_ai": false,
    "model": "fallback-opencv-pillow",
    "time_ms": 1234
  },
  "urls": {
    "result": "/result/{id}",
    "download": "/download/{id}"
  }
}
```

## Пример запроса `process`

```bash
curl -X POST "http://127.0.0.1:8001/api/process" ^
  -F "file=@example.jpg" ^
  -F "prefer_ai=false" ^
  -F "mode=enhance"
```

Для PowerShell удобнее так:

```powershell
$form = @{
  file = Get-Item ".\example.jpg"
  prefer_ai = "false"
  mode = "enhance"
}
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/process" -Method Post -Form $form
```

## Где хранятся файлы

- исходные загрузки: `storage/uploads/`
- результаты и metadata: `storage/results/`

Для каждого job сохраняются:

- исходный файл;
- результат обработки;
- metadata JSON с итоговым контрактом ответа.

## Тесты

Запуск из корня проекта:

```bash
python -m pytest backend/tests -q
```

Покрыты сценарии:

- `health`
- `model/status`
- успешный `process`
- получение `result/{id}`
- скачивание `download/{id}`
- удаление через `DELETE /result/{id}`
- ошибка для неподдерживаемого файла
- ошибка для слишком большого файла

## CORS

Для frontend dev-сервера разрешены:

- `http://127.0.0.1:5173`
- `http://localhost:5173`
- `http://127.0.0.1:4173`
- `http://localhost:4173`
- `http://127.0.0.1:3000`
- `http://localhost:3000`

## Как подключить реальную AI-модель позже

Следующий этап:

1. добавить загрузку `PyTorch` / pretrained CV model;
2. выделить отдельный сервис инференса;
3. расширить `processing.mode` под реальные сценарии;
4. заменить fallback-ветку на AI-ветку для нужных режимов;
5. при необходимости добавить очередь задач и постоянное хранение результатов.
