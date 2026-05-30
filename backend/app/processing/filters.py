from __future__ import annotations

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageOps


def pil_to_bgr(image: Image.Image) -> np.ndarray:
    rgb = np.array(image.convert("RGB"), dtype=np.uint8)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def bgr_to_pil(image_bgr: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def _apply_unsharp_mask(image_bgr: np.ndarray, amount: float, sigma: float) -> np.ndarray:
    blurred = cv2.GaussianBlur(image_bgr, (0, 0), sigma)
    return cv2.addWeighted(image_bgr, 1.0 + amount, blurred, -amount, 0)


def _apply_clahe(image_bgr: np.ndarray, clip_limit: float) -> np.ndarray:
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
    l_channel = clahe.apply(l_channel)
    enhanced = cv2.merge((l_channel, a_channel, b_channel))
    return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)


def _boost_saturation_and_brightness(image_bgr: np.ndarray, saturation: float, brightness: float) -> np.ndarray:
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * saturation, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * brightness, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


def enhance_image(image_bgr: np.ndarray) -> np.ndarray:
    denoised = cv2.fastNlMeansDenoisingColored(image_bgr, None, 4, 4, 7, 21)
    contrasted = _apply_clahe(denoised, clip_limit=2.0)
    vivid = _boost_saturation_and_brightness(contrasted, saturation=1.08, brightness=1.03)
    return _apply_unsharp_mask(vivid, amount=0.35, sigma=1.1)


def restore_image(image_bgr: np.ndarray) -> np.ndarray:
    denoised = cv2.fastNlMeansDenoisingColored(image_bgr, None, 9, 9, 7, 21)
    softened = cv2.bilateralFilter(denoised, d=7, sigmaColor=30, sigmaSpace=30)
    contrasted = _apply_clahe(softened, clip_limit=1.6)
    return _apply_unsharp_mask(contrasted, amount=0.22, sigma=1.3)


def upscale_image(image_bgr: np.ndarray, scale: int) -> np.ndarray:
    height, width = image_bgr.shape[:2]
    resized = cv2.resize(image_bgr, (width * scale, height * scale), interpolation=cv2.INTER_LANCZOS4)
    return _apply_unsharp_mask(resized, amount=0.18, sigma=0.9)


def colorize_image(image_bgr: np.ndarray) -> np.ndarray:
    image = bgr_to_pil(image_bgr)
    grayscale = ImageOps.grayscale(image)
    tinted = ImageOps.colorize(grayscale, black="#2f2330", white="#f3d7b6")
    tinted = ImageEnhance.Color(tinted).enhance(1.1)
    blended = Image.blend(image.convert("RGB"), tinted, 0.35)
    return pil_to_bgr(blended)
