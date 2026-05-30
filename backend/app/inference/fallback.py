from __future__ import annotations

from PIL import Image

from ..processing.filters import (
    bgr_to_pil,
    colorize_image,
    enhance_image,
    pil_to_bgr,
    restore_image,
    upscale_image,
)
from .base import ImageProcessor, InferenceResult


class FallbackImageProcessor(ImageProcessor):
    name = "fallback-opencv-pillow"
    framework = "opencv-pillow-fallback"
    supported_modes = ("enhance", "restore", "upscale", "colorize")

    def process(
        self,
        *,
        image: Image.Image,
        mode: str = "enhance",
        prefer_ai: bool = True,
        upscale_scale: int = 2,
    ) -> InferenceResult:
        del prefer_ai

        mode_norm = (mode or "").strip().lower()
        if mode_norm not in self.supported_modes:
            raise ValueError("unsupported_mode")

        image_bgr = pil_to_bgr(image)

        if mode_norm == "enhance":
            output_bgr = enhance_image(image_bgr)
        elif mode_norm == "restore":
            output_bgr = restore_image(image_bgr)
        elif mode_norm == "upscale":
            output_bgr = upscale_image(image_bgr, scale=max(1, int(upscale_scale or 2)))
        else:
            output_bgr = colorize_image(image_bgr)

        return InferenceResult(
            image=bgr_to_pil(output_bgr),
            used_ai=False,
            model_name=self.name,
            mode=mode_norm,
        )
