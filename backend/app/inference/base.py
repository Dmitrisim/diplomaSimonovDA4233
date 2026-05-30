from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


@dataclass(frozen=True)
class InferenceResult:
    image: Image.Image
    used_ai: bool
    model_name: str | None
    mode: str


@dataclass(frozen=True)
class ProcessorRuntime:
    ai_processor: "ImageProcessor | None"
    fallback_processor: "ImageProcessor"
    available: bool
    active_processor: str
    default_processor: str
    model: str | None
    model_name: str | None
    framework: str
    model_path: str | None
    model_file_exists: bool
    availability_reason: str | None
    supported_modes: tuple[str, ...]
    fallback_available: bool = True

    def resolve_processor(self, mode: str, prefer_ai: bool) -> "ImageProcessor":
        mode_norm = (mode or "").strip().lower()
        if self.ai_processor is not None and self.available and prefer_ai and self.ai_processor.supports_mode(mode_norm):
            return self.ai_processor
        if self.fallback_processor.supports_mode(mode_norm):
            return self.fallback_processor
        if self.ai_processor is not None and self.available and self.ai_processor.supports_mode(mode_norm):
            return self.ai_processor
        raise ValueError("unsupported_mode")

    def process(
        self,
        *,
        image: Image.Image,
        mode: str = "enhance",
        prefer_ai: bool = True,
        upscale_scale: int = 2,
    ) -> InferenceResult:
        processor = self.resolve_processor(mode, prefer_ai)
        try:
            return processor.process(
                image=image,
                mode=mode,
                prefer_ai=prefer_ai,
                upscale_scale=upscale_scale,
            )
        except Exception:
            if processor is self.ai_processor and self.fallback_processor.supports_mode(mode):
                return self.fallback_processor.process(
                    image=image,
                    mode=mode,
                    prefer_ai=False,
                    upscale_scale=upscale_scale,
                )
            raise


class ImageProcessor(ABC):
    name: str
    framework: str
    supported_modes: tuple[str, ...]
    model_name: str | None = None
    model_path: Path | None = None

    def supports_mode(self, mode: str) -> bool:
        return (mode or "").strip().lower() in self.supported_modes

    @abstractmethod
    def process(
        self,
        *,
        image: Image.Image,
        mode: str = "enhance",
        prefer_ai: bool = True,
        upscale_scale: int = 2,
    ) -> InferenceResult:
        raise NotImplementedError
