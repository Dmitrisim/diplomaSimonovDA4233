from __future__ import annotations

import sys
from pathlib import Path

import cv2
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.config import get_settings
from backend.app.inference.ai_processor import AIProcessor
from backend.app.inference.model_loader import resolve_ai_model_path


def yes_no(value: bool) -> str:
    return "yes" if value else "no"


def main() -> int:
    settings = get_settings()
    model_path = resolve_ai_model_path(settings.models_dir)
    model_exists = model_path.exists()
    dnn_superres_available = AIProcessor.dependencies_ready()
    model_loaded = False

    print(f"OpenCV version: {cv2.__version__}")
    print(f"dnn_superres available: {yes_no(dnn_superres_available)}")
    print(f"model path: {model_path}")
    print(f"model file exists: {yes_no(model_exists)}")

    if not model_exists:
        print("model loaded: no")
        print("success: no, model file not found")
        return 1

    if not dnn_superres_available:
        print("model loaded: no")
        print("success: no, cv2.dnn_superres is unavailable")
        return 1

    try:
        processor = AIProcessor(model_path=model_path, model_name=model_path.name)
        processor.validate_model()
        model_loaded = True
        print("model loaded: yes")
    except Exception as exc:
        print("model loaded: no")
        print(f"success: no, failed to load model: {exc}")
        return 1

    try:
        image = Image.new("RGB", (64, 64), color=(180, 140, 90))
        result = processor.process(image=image, mode="upscale", prefer_ai=True, upscale_scale=2)
        print(f"test image input: {image.size[0]}x{image.size[1]}")
        print(f"test image output: {result.image.size[0]}x{result.image.size[1]}")
        if result.image.size != (128, 128):
            print("success: no, upscale result is not 128x128")
            return 1
    except Exception as exc:
        print(f"success: no, test upscale failed: {exc}")
        return 1

    print(f"success: {'yes' if model_loaded else 'no'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
