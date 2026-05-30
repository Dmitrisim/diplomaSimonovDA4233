# Models Directory

Сюда вручную кладутся файлы весов моделей для backend.

## EDSR_x2.pb

- Основной путь по умолчанию: `backend/models/EDSR_x2.pb`
- Файл весов не коммитится в git
- При необходимости можно указать другой путь через `PHOTORESTORE_AI_MODEL_PATH`

## Быстрый сценарий

Windows PowerShell:

```powershell
mkdir backend\models

# после ручного скачивания файл должен лежать здесь:
backend\models\EDSR_x2.pb
```

Linux:

```bash
mkdir -p backend/models

# после ручного скачивания файл должен лежать здесь:
backend/models/EDSR_x2.pb
```

## Переменная окружения

Windows PowerShell:

```powershell
$env:PHOTORESTORE_AI_MODEL_PATH="C:\path\to\EDSR_x2.pb"
```

Linux:

```bash
export PHOTORESTORE_AI_MODEL_PATH=/var/www/project/backend/models/EDSR_x2.pb
```

## Проверка

После размещения файла проверь:

- `python backend/scripts/check_model.py`
- `GET /api/model/status`

Если файл отсутствует или не загружается, backend автоматически продолжит работу через `fallback-opencv-pillow`.
