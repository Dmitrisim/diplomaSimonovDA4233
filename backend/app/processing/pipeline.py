from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from .superres import SuperResolutionResult, try_super_resolve


@dataclass(frozen=True)
class ProcessResult:
    image: Image.Image
    used_ai: bool
    model_name: str | None
    mode: str


def _pil_to_bgr(image: Image.Image) -> np.ndarray:
    rgb = np.array(image.convert("RGB"), dtype=np.uint8)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def _bgr_to_pil(image_bgr: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def _fallback_enhance(image_bgr: np.ndarray) -> np.ndarray:
    denoised = cv2.fastNlMeansDenoisingColored(image_bgr, None, 6, 6, 7, 21)
    blurred = cv2.GaussianBlur(denoised, (0, 0), 1.2)
    sharpened = cv2.addWeighted(denoised, 1.6, blurred, -0.6, 0)
    return sharpened


def _classic_upscale(image_bgr: np.ndarray, scale: int) -> np.ndarray:
    h, w = image_bgr.shape[:2]
    return cv2.resize(image_bgr, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)


def process_image(
    image: Image.Image,
    models_dir: Path,
    mode: str = "enhance",
    prefer_ai: bool = True,
    upscale_scale: int = 2,
) -> ProcessResult:
    image_bgr = _pil_to_bgr(image)

    mode_norm = (mode or "").strip().lower()
    if mode_norm not in {"enhance", "upscale"}:
        raise ValueError("unsupported_mode")

    sr: SuperResolutionResult
    if mode_norm == "upscale":
        if prefer_ai:
            sr = try_super_resolve(image_bgr=image_bgr, models_dir=models_dir)
        else:
            sr = SuperResolutionResult(image_bgr=image_bgr, used_ai=False, model_name=None)

        out_bgr = sr.image_bgr
        if not sr.used_ai:
            out_bgr = _classic_upscale(out_bgr, scale=upscale_scale)
    else:
        sr = SuperResolutionResult(image_bgr=image_bgr, used_ai=False, model_name=None)
        out_bgr = sr.image_bgr

    out_bgr = _fallback_enhance(out_bgr)

    out_pil = _bgr_to_pil(out_bgr)
    return ProcessResult(image=out_pil, used_ai=sr.used_ai, model_name=sr.model_name, mode=mode_norm)
