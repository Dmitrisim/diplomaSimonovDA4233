from __future__ import annotations

from PIL import Image

from ..processing.filters import (
    bgr_to_pil,
    colorize_image,
    denoise_image,
    enhance_image,
    pil_to_bgr,
    restore_image,
    upscale_image,
    web_export_image,
)
from .base import ImageProcessor, InferenceResult


class FallbackImageProcessor(ImageProcessor):
    name = "fallback-opencv-pillow"
    framework = "opencv-pillow-fallback"
    supported_modes = ("enhance", "restore", "denoise", "upscale", "colorize", "web")

    def process(
        self,
        *,
        image: Image.Image,
        mode: str = "enhance",
        prefer_ai: bool = True,
        upscale_scale: int = 2,
        max_width: int | None = None,
        max_height: int | None = None,
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
        elif mode_norm == "denoise":
            output_bgr = denoise_image(image_bgr)
        elif mode_norm == "upscale":
            output_bgr = upscale_image(image_bgr, scale=max(1, int(upscale_scale or 2)))
        elif mode_norm == "web":
            output_bgr = web_export_image(
                image_bgr,
                max_width=max_width or 1920,
                max_height=max_height or 1080,
            )
        else:
            output_bgr = colorize_image(image_bgr)

        return InferenceResult(
            image=bgr_to_pil(output_bgr),
            used_ai=False,
            model_name=self.name,
            mode=mode_norm,
        )
