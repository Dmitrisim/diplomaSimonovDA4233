from __future__ import annotations

import logging
import os
from pathlib import Path

from .base import ImageProcessor, InferenceResult, ProcessorRuntime
from .ai_processor import AIProcessor
from .colorization_processor import ColorizationAIProcessor
from .fallback import FallbackImageProcessor

AI_MODEL_PATH_ENV = "PHOTORESTORE_AI_MODEL_PATH"
COLORIZATION_PROTO_PATH_ENV = "PHOTORESTORE_COLORIZATION_PROTO_PATH"
COLORIZATION_MODEL_PATH_ENV = "PHOTORESTORE_COLORIZATION_MODEL_PATH"
COLORIZATION_POINTS_PATH_ENV = "PHOTORESTORE_COLORIZATION_POINTS_PATH"
DEFAULT_AI_MODEL_FILENAME = "EDSR_x2.pb"
DEFAULT_COLORIZATION_PROTO_FILENAME = "colorization_deploy_v2.prototxt"
DEFAULT_COLORIZATION_MODEL_FILENAME = "colorization_release_v2.caffemodel"
DEFAULT_COLORIZATION_POINTS_FILENAME = "pts_in_hull.npy"
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


def _resolve_optional_model_path(
    *,
    models_dir: Path,
    env_name: str,
    default_filename: str,
) -> Path:
    configured_path = os.getenv(env_name)
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
    return _normalize_path(models_dir / default_filename)


def resolve_colorization_model_paths(models_dir: Path) -> tuple[Path, Path, Path]:
    return (
        _resolve_optional_model_path(
            models_dir=models_dir,
            env_name=COLORIZATION_PROTO_PATH_ENV,
            default_filename=DEFAULT_COLORIZATION_PROTO_FILENAME,
        ),
        _resolve_optional_model_path(
            models_dir=models_dir,
            env_name=COLORIZATION_MODEL_PATH_ENV,
            default_filename=DEFAULT_COLORIZATION_MODEL_FILENAME,
        ),
        _resolve_optional_model_path(
            models_dir=models_dir,
            env_name=COLORIZATION_POINTS_PATH_ENV,
            default_filename=DEFAULT_COLORIZATION_POINTS_FILENAME,
        ),
    )


class CompositeAIProcessor(ImageProcessor):
    name = "ai-multi-opencv"
    framework = "opencv-dnn"

    def __init__(self, processors: tuple[ImageProcessor, ...]) -> None:
        self.processors = processors
        self.supported_modes = tuple(
            dict.fromkeys(
                mode
                for processor in processors
                for mode in processor.supported_modes
            ),
        )
        self.model_name = ", ".join(
            processor.model_name or processor.name for processor in processors
        )

    def process(
        self,
        *,
        image,
        mode: str = "enhance",
        prefer_ai: bool = True,
        upscale_scale: int = 2,
        max_width: int | None = None,
        max_height: int | None = None,
    ) -> InferenceResult:
        mode_norm = (mode or "").strip().lower()
        for processor in self.processors:
            if processor.supports_mode(mode_norm):
                return processor.process(
                    image=image,
                    mode=mode,
                    prefer_ai=prefer_ai,
                    upscale_scale=upscale_scale,
                    max_width=max_width,
                    max_height=max_height,
                )
        raise ValueError("unsupported_mode")


def _load_superres_processor(models_dir: Path) -> AIProcessor | None:
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


def _load_colorization_processor(models_dir: Path) -> ColorizationAIProcessor | None:
    proto_path, model_path, points_path = resolve_colorization_model_paths(models_dir)
    if not proto_path.exists() or not model_path.exists() or not points_path.exists():
        return None
    if not ColorizationAIProcessor.dependencies_ready():
        return None

    try:
        processor = ColorizationAIProcessor(
            proto_path=proto_path,
            model_path=model_path,
            points_path=points_path,
            model_name=model_path.name,
        )
        processor.validate_model()
        return processor
    except Exception:
        return None


def _compose_ai_processor(processors: tuple[ImageProcessor, ...]) -> ImageProcessor | None:
    if not processors:
        return None
    if len(processors) == 1:
        return processors[0]
    return CompositeAIProcessor(processors)


def load_processor_runtime(models_dir: Path) -> ProcessorRuntime:
    fallback = FallbackImageProcessor()
    model_path = resolve_ai_model_path(models_dir)
    configured_path = os.getenv(AI_MODEL_PATH_ENV)
    model_file_exists = model_path.exists()
    ai_processors = tuple(
        processor
        for processor in (
            _load_superres_processor(models_dir),
            _load_colorization_processor(models_dir),
        )
        if processor is not None
    )
    ai_processor = _compose_ai_processor(ai_processors)
    active_processor = ai_processor.name if ai_processor is not None else fallback.name
    framework = ai_processor.framework if ai_processor is not None else fallback.framework
    active_model = ai_processor.model_name if ai_processor is not None else fallback.name
    active_model_paths = tuple(
        processor.model_path
        for processor in ai_processors
        if processor.model_path is not None
    )
    active_model_path = active_model_paths[0] if len(active_model_paths) == 1 else model_path
    ai_supported_modes = tuple(
        dict.fromkeys(
            mode
            for processor in ai_processors
            for mode in processor.supported_modes
        ),
    )
    ai_processor_names = tuple(processor.name for processor in ai_processors)
    supported_modes = tuple(
        dict.fromkeys(
            (
                *fallback.supported_modes,
                *(ai_processor.supported_modes if ai_processor else ()),
            ),
        ),
    )
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
        model_path=str(active_model_path),
        model_file_exists=model_file_exists or ai_processor is not None,
        availability_reason=availability_reason,
        supported_modes=supported_modes,
        ai_supported_modes=ai_supported_modes,
        ai_processors=ai_processor_names,
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
