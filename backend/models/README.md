# Models Directory

Сюда вручную кладутся файлы весов моделей для backend.

## EDSR_x2.pb

- Основной путь по умолчанию: `backend/models/EDSR_x2.pb`
- Файл весов не коммитится в git
- При необходимости можно указать другой путь через `PHOTORESTORE_AI_MODEL_PATH`

## AI-колоризация

Для режима `colorize` backend ожидает три файла:

- `backend/models/colorization_deploy_v2.prototxt`
- `backend/models/colorization_release_v2.caffemodel`
- `backend/models/pts_in_hull.npy`

Эти файлы не коммитятся в git. При необходимости можно указать другие пути через:

- `PHOTORESTORE_COLORIZATION_PROTO_PATH`
- `PHOTORESTORE_COLORIZATION_MODEL_PATH`
- `PHOTORESTORE_COLORIZATION_POINTS_PATH`

## Быстрый сценарий

Windows PowerShell:

```powershell
mkdir backend\models

# после ручного скачивания файл должен лежать здесь:
backend\models\EDSR_x2.pb

# для AI-колоризации:
backend\models\colorization_deploy_v2.prototxt
backend\models\colorization_release_v2.caffemodel
backend\models\pts_in_hull.npy
```

Linux:

```bash
mkdir -p backend/models

# после ручного скачивания файл должен лежать здесь:
backend/models/EDSR_x2.pb

# для AI-колоризации:
backend/models/colorization_deploy_v2.prototxt
backend/models/colorization_release_v2.caffemodel
backend/models/pts_in_hull.npy
```

## Переменная окружения

Windows PowerShell:

```powershell
$env:PHOTORESTORE_AI_MODEL_PATH="C:\path\to\EDSR_x2.pb"
$env:PHOTORESTORE_COLORIZATION_PROTO_PATH="C:\path\to\colorization_deploy_v2.prototxt"
$env:PHOTORESTORE_COLORIZATION_MODEL_PATH="C:\path\to\colorization_release_v2.caffemodel"
$env:PHOTORESTORE_COLORIZATION_POINTS_PATH="C:\path\to\pts_in_hull.npy"
```

Linux:

```bash
export PHOTORESTORE_AI_MODEL_PATH=/var/www/project/backend/models/EDSR_x2.pb
export PHOTORESTORE_COLORIZATION_PROTO_PATH=/var/www/project/backend/models/colorization_deploy_v2.prototxt
export PHOTORESTORE_COLORIZATION_MODEL_PATH=/var/www/project/backend/models/colorization_release_v2.caffemodel
export PHOTORESTORE_COLORIZATION_POINTS_PATH=/var/www/project/backend/models/pts_in_hull.npy
```

## Проверка

После размещения файла проверь:

- `python backend/scripts/check_model.py`
- `python backend/scripts/check_model.py --require-all`
- `GET /api/model/status`

Если файл отсутствует или не загружается, backend автоматически продолжит работу через `fallback-opencv-pillow`.
