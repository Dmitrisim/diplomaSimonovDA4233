from __future__ import annotations

import logging
import os
from pathlib import Path

from .base import ProcessorRuntime
from .ai_processor import AIProcessor
from .fallback import FallbackImageProcessor

AI_MODEL_PATH_ENV = "PHOTORESTORE_AI_MODEL_PATH"
DEFAULT_AI_MODEL_FILENAME = "EDSR_x2.pb"
logger = logging.getLogger("photorestore.inference")


def _normalize_path(path: Path) -> Path:
    return path.expanduser().resolve(strict=False)


def resolve_ai_model_path(models_dir: Path) -> Path:
    configured_path = os.getenv(AI_MODEL_PATH_ENV)
    if configured_path:
        raw_path = Path(configured_path).expanduser()
        if raw_path.is_absolute():
            return _normalize_path(raw_path)

        project_root = models_dir.parent.parent
        backend_dir = models_dir.parent
        candidates = (
            project_root / raw_path,
            backend_dir / raw_path,
            models_dir / raw_path,
        )
        for candidate in candidates:
            if candidate.exists():
                return _normalize_path(candidate)

        preferred = models_dir / raw_path if len(raw_path.parts) == 1 else project_root / raw_path
        return _normalize_path(preferred)
    return _normalize_path(models_dir / DEFAULT_AI_MODEL_FILENAME)


def _load_real_model_processor(models_dir: Path) -> AIProcessor | None:
    model_path = resolve_ai_model_path(models_dir)
    if not model_path.exists():
        return None
    if not AIProcessor.dependencies_ready():
        return None

    try:
        processor = AIProcessor(model_path=model_path, model_name=model_path.name)
        processor.validate_model()
        return processor
    except Exception:
        return None


def load_processor_runtime(models_dir: Path) -> ProcessorRuntime:
    fallback = FallbackImageProcessor()
    model_path = resolve_ai_model_path(models_dir)
    configured_path = os.getenv(AI_MODEL_PATH_ENV)
    model_file_exists = model_path.exists()
    ai_processor = _load_real_model_processor(models_dir)
    active_processor = ai_processor.name if ai_processor is not None else fallback.name
    framework = ai_processor.framework if ai_processor is not None else fallback.framework
    active_model = ai_processor.model_name if ai_processor is not None else fallback.name
    supported_modes = tuple(dict.fromkeys((*fallback.supported_modes, *(ai_processor.supported_modes if ai_processor else ()))))
    availability_reason: str | None = None

    if ai_processor is None:
        if not configured_path and not model_file_exists:
            availability_reason = "AI model path not configured"
        elif not model_file_exists:
            availability_reason = "AI model file not found"
        elif not AIProcessor.dependencies_ready():
            availability_reason = "OpenCV dnn_superres is not available"
        else:
            availability_reason = "AI model initialization failed"

    return ProcessorRuntime(
        ai_processor=ai_processor,
        fallback_processor=fallback,
        available=ai_processor is not None,
        active_processor=active_processor,
        default_processor=active_processor,
        model=active_model,
        model_name=ai_processor.model_name if ai_processor is not None else None,
        framework=framework,
        model_path=str(model_path),
        model_file_exists=model_file_exists,
        availability_reason=availability_reason,
        supported_modes=supported_modes,
        fallback_available=True,
    )


def log_processor_runtime_status(models_dir: Path) -> None:
    runtime = load_processor_runtime(models_dir)
    configured_path = os.getenv(AI_MODEL_PATH_ENV)

    if configured_path:
        logger.info("AI model path configured: %s", runtime.model_path)
    else:
        logger.info("AI model path not configured")
        logger.info("Using default AI model path: %s", runtime.model_path)

    if runtime.model_file_exists:
        logger.info("AI model file detected: %s", runtime.model_path)
    else:
        logger.warning("AI model file not found: %s", runtime.model_path)

    if runtime.available:
        logger.info("AI model loaded successfully: %s", runtime.model)
    elif runtime.availability_reason:
        logger.warning("AI unavailable: %s", runtime.availability_reason)

    logger.info("Fallback processor active: %s", runtime.fallback_processor.name)
