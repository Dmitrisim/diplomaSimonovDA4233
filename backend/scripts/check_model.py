from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.config import get_settings
from backend.app.inference import (
    AIProcessor,
    ColorizationAIProcessor,
    load_processor_runtime,
    resolve_ai_model_path,
    resolve_colorization_model_paths,
)


AI_MODES = ("upscale", "colorize")


def yes_no(value: bool) -> str:
    return "yes" if value else "no"


def print_section(title: str) -> None:
    print()
    print(f"== {title} ==")


def check_superres(models_dir: Path) -> tuple[bool, bool]:
    print_section("AI super-resolution")
    model_path = resolve_ai_model_path(models_dir)
    model_exists = model_path.exists()
    dependencies_ready = AIProcessor.dependencies_ready()

    print(f"OpenCV dnn_superres available: {yes_no(dependencies_ready)}")
    print(f"model path: {model_path}")
    print(f"model file exists: {yes_no(model_exists)}")

    if not model_exists:
        print("model loaded: no")
        return False, False
    if not dependencies_ready:
        print("model loaded: no")
        print("failure: cv2.dnn_superres is unavailable")
        return False, True

    try:
        processor = AIProcessor(model_path=model_path, model_name=model_path.name)
        processor.validate_model()
        image = Image.new("RGB", (64, 64), color=(180, 140, 90))
        result = processor.process(
            image=image,
            mode="upscale",
            prefer_ai=True,
            upscale_scale=2,
        )
    except Exception as exc:
        print("model loaded: no")
        print(f"failure: failed to run super-resolution: {exc}")
        return False, True

    print("model loaded: yes")
    print(f"test image input: {image.size[0]}x{image.size[1]}")
    print(f"test image output: {result.image.size[0]}x{result.image.size[1]}")
    if result.image.size != (128, 128) or not result.used_ai:
        print("failure: unexpected super-resolution result")
        return False, True

    print("success: yes")
    return True, False


def check_colorization(models_dir: Path) -> tuple[bool, bool]:
    print_section("AI colorization")
    proto_path, model_path, points_path = resolve_colorization_model_paths(models_dir)
    paths = (
        ("proto", proto_path),
        ("model", model_path),
        ("points", points_path),
    )
    existing_count = sum(path.exists() for _, path in paths)
    dependencies_ready = ColorizationAIProcessor.dependencies_ready()

    print(f"OpenCV dnn colorization available: {yes_no(dependencies_ready)}")
    for label, path in paths:
        print(f"{label} path: {path}")
        print(f"{label} file exists: {yes_no(path.exists())}")

    if existing_count == 0:
        print("model loaded: no")
        return False, False
    if existing_count != len(paths):
        print("model loaded: no")
        print("failure: colorization model files are incomplete")
        return False, True
    if not dependencies_ready:
        print("model loaded: no")
        print("failure: cv2.dnn.readNetFromCaffe is unavailable")
        return False, True

    try:
        processor = ColorizationAIProcessor(
            proto_path=proto_path,
            model_path=model_path,
            points_path=points_path,
            model_name=model_path.name,
        )
        processor.validate_model()
        image = Image.new("L", (96, 64), color=145).convert("RGB")
        result = processor.process(image=image, mode="colorize", prefer_ai=True)
    except Exception as exc:
        print("model loaded: no")
        print(f"failure: failed to run colorization: {exc}")
        return False, True

    print("model loaded: yes")
    print(f"test image input: {image.size[0]}x{image.size[1]}")
    print(f"test image output: {result.image.size[0]}x{result.image.size[1]}")
    if result.image.size != image.size or not result.used_ai:
        print("failure: unexpected colorization result")
        return False, True

    print("success: yes")
    return True, False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check PhotoRestore AI model availability.",
    )
    parser.add_argument(
        "--require",
        action="append",
        choices=AI_MODES,
        default=[],
        help="Require a specific AI mode. Can be passed multiple times.",
    )
    parser.add_argument(
        "--require-all",
        action="store_true",
        help="Require both upscale and colorize AI modes.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    settings = get_settings()

    print(f"OpenCV version: {cv2.__version__}")
    print(f"models dir: {settings.models_dir}")

    superres_ok, superres_failed = check_superres(settings.models_dir)
    colorize_ok, colorize_failed = check_colorization(settings.models_dir)

    print_section("Runtime")
    runtime = load_processor_runtime(settings.models_dir)
    print(f"available: {yes_no(runtime.available)}")
    print(f"active processor: {runtime.active_processor}")
    print(f"model: {runtime.model}")
    print(f"supported modes: {', '.join(runtime.supported_modes)}")
    print(f"AI supported modes: {', '.join(runtime.ai_supported_modes) or '-'}")
    print(f"AI processors: {', '.join(runtime.ai_processors) or '-'}")
    print(f"fallback available: {yes_no(runtime.fallback_available)}")
    if runtime.availability_reason:
        print(f"availability reason: {runtime.availability_reason}")

    required_modes = set(args.require)
    if args.require_all:
        required_modes.update(AI_MODES)
    missing_modes = required_modes.difference(runtime.ai_supported_modes)

    if superres_failed or colorize_failed:
        print("success: no, at least one configured AI model failed")
        return 1
    if missing_modes:
        print(f"success: no, missing required AI modes: {', '.join(sorted(missing_modes))}")
        return 1
    if not runtime.available:
        print("success: no, no AI processor is available")
        return 1

    available_modes = {
        mode
        for mode, ok in (
            ("upscale", superres_ok),
            ("colorize", colorize_ok),
        )
        if ok
    }
    print(f"success: yes, available AI modes: {', '.join(sorted(available_modes))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
