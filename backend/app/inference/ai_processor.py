from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

import cv2
from PIL import Image

from ..processing.filters import bgr_to_pil, pil_to_bgr
from .base import ImageProcessor, InferenceResult


class AIProcessor(ImageProcessor):
    name = "ai-superres-opencv"
    framework = "opencv-dnn-superres"
    supported_modes = ("upscale",)

    def __init__(self, *, model_path: Path, model_name: str | None = None) -> None:
        self.model_path = Path(model_path)
        self.model_name = model_name or self.model_path.name
        self._sr = None
        self._opencv_model_path = self._prepare_model_path(self.model_path)

    @staticmethod
    def dependencies_ready() -> bool:
        return hasattr(cv2, "dnn_superres") and hasattr(
            cv2.dnn_superres,
            "DnnSuperResImpl_create",
        )

    def validate_model(self) -> None:
        self._get_sr()

    def _prepare_model_path(self, model_path: Path) -> Path:
        # OpenCV on Windows may fail to open .pb files from Unicode paths.
        try:
            str(model_path).encode("ascii")
            return model_path
        except UnicodeEncodeError:
            temp_dir = Path(tempfile.gettempdir()) / "photorestore-ai"
            temp_dir.mkdir(parents=True, exist_ok=True)
            temp_path = temp_dir / "EDSR_x2.pb"
            if not temp_path.exists() or model_path.stat().st_mtime > temp_path.stat().st_mtime:
                shutil.copyfile(model_path, temp_path)
            return temp_path

    def _create_sr(self):
        if not self.dependencies_ready():
            raise RuntimeError("cv2.dnn_superres is unavailable")

        sr = cv2.dnn_superres.DnnSuperResImpl_create()
        sr.readModel(str(self._opencv_model_path))
        sr.setModel("edsr", 2)
        return sr

    def _get_sr(self):
        if self._sr is None:
            self._sr = self._create_sr()
        return self._sr

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
        del upscale_scale
        del max_width
        del max_height

        mode_norm = (mode or "").strip().lower()
        if mode_norm != "upscale":
            raise ValueError("unsupported_mode")

        image_bgr = pil_to_bgr(image)
        output_bgr = self._get_sr().upsample(image_bgr)

        return InferenceResult(
            image=bgr_to_pil(output_bgr),
            used_ai=True,
            model_name=self.model_name,
            mode="upscale",
        )
