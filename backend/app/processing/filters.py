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


def denoise_image(image_bgr: np.ndarray) -> np.ndarray:
    channel_spread = np.mean(
        np.max(image_bgr, axis=2).astype(np.float32)
        - np.min(image_bgr, axis=2).astype(np.float32),
    )
    if channel_spread < 8:
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        denoised_gray = cv2.fastNlMeansDenoising(
            gray,
            None,
            h=18,
            templateWindowSize=7,
            searchWindowSize=21,
        )
        denoised = cv2.cvtColor(denoised_gray, cv2.COLOR_GRAY2BGR)
    else:
        denoised = cv2.fastNlMeansDenoisingColored(
            image_bgr,
            None,
            h=9,
            hColor=9,
            templateWindowSize=7,
            searchWindowSize=21,
        )
    smoothed = cv2.bilateralFilter(denoised, 5, 32, 32)
    blended = cv2.addWeighted(image_bgr, 0.2, smoothed, 0.8, 0)
    return _apply_unsharp_mask(blended, amount=0.08, sigma=1.0)


def _warm_monochrome(gray: np.ndarray) -> np.ndarray:
    gray_f = gray.astype(np.float32)
    blue = np.clip(gray_f * 0.94, 0, 255)
    green = np.clip(gray_f, 0, 255)
    red = np.clip(gray_f * 1.04, 0, 255)
    return cv2.merge((blue, green, red)).astype(np.uint8)


def _repair_small_marks(image_bgr: np.ndarray) -> np.ndarray:
    height, width = image_bgr.shape[:2]
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    median = cv2.medianBlur(gray, 5)

    dark_marks = cv2.subtract(median, gray)
    light_marks = cv2.subtract(gray, median)
    _, dark_mask = cv2.threshold(dark_marks, 30, 255, cv2.THRESH_BINARY)
    _, light_mask = cv2.threshold(light_marks, 34, 255, cv2.THRESH_BINARY)
    mask = cv2.bitwise_or(dark_mask, light_mask)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    labels_count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    clean_mask = np.zeros_like(mask)
    max_area = max(24, min(520, (height * width) // 4500))
    for label in range(1, labels_count):
        area = stats[label, cv2.CC_STAT_AREA]
        if 2 <= area <= max_area:
            clean_mask[labels == label] = 255

    if not np.any(clean_mask):
        return image_bgr

    clean_mask = cv2.dilate(clean_mask, kernel, iterations=1)
    return cv2.inpaint(image_bgr, clean_mask, 2, cv2.INPAINT_TELEA)


def restore_image(image_bgr: np.ndarray) -> np.ndarray:
    denoised = cv2.fastNlMeansDenoisingColored(image_bgr, None, 7, 7, 7, 21)
    repaired = _repair_small_marks(denoised)

    gray = cv2.cvtColor(repaired, cv2.COLOR_BGR2GRAY)
    gray = cv2.fastNlMeansDenoising(gray, None, h=7, templateWindowSize=7, searchWindowSize=21)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)

    tone = _warm_monochrome(gray)
    channel_spread = np.mean(
        np.max(repaired, axis=2).astype(np.float32)
        - np.min(repaired, axis=2).astype(np.float32),
    )
    tone_weight = 0.72 if channel_spread < 45 else 0.45
    restored = cv2.addWeighted(repaired, 1.0 - tone_weight, tone, tone_weight, 0)

    smoothed = cv2.bilateralFilter(restored, 5, 26, 26)
    restored = cv2.addWeighted(restored, 0.76, smoothed, 0.24, 0)
    sharpened = _apply_unsharp_mask(restored, amount=0.22, sigma=1.1)
    return cv2.addWeighted(image_bgr, 0.12, sharpened, 0.88, 0)


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
