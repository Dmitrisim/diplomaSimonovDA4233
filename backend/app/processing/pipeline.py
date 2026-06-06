from __future__ import annotations

from pathlib import Path

from PIL import Image

from ..inference import InferenceResult, ProcessorRuntime, load_processor_runtime


ProcessResult = InferenceResult


def process_image(
    image: Image.Image,
    models_dir: Path,
    mode: str = "enhance",
    prefer_ai: bool = True,
    upscale_scale: int = 2,
    max_width: int | None = None,
    max_height: int | None = None,
) -> ProcessResult:
    runtime = load_processor_runtime(models_dir)
    return runtime.process(
        image=image,
        mode=mode,
        prefer_ai=prefer_ai,
        upscale_scale=upscale_scale,
        max_width=max_width,
        max_height=max_height,
    )


def get_processor_runtime(models_dir: Path) -> ProcessorRuntime:
    return load_processor_runtime(models_dir)
