from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from .base import ImageProcessor, InferenceResult


class ColorizationAIProcessor(ImageProcessor):
    name = "ai-colorization-opencv"
    framework = "opencv-dnn-colorization"
    supported_modes = ("colorize",)

    def __init__(
        self,
        *,
        proto_path: Path,
        model_path: Path,
        points_path: Path,
        model_name: str | None = None,
    ) -> None:
        self.proto_path = Path(proto_path)
        self.model_path = Path(model_path)
        self.points_path = Path(points_path)
        self.model_name = model_name or self.model_path.name
        self._net = None
        self._opencv_proto_path = self._prepare_model_path(self.proto_path)
        self._opencv_model_path = self._prepare_model_path(self.model_path)
        self._opencv_points_path = self._prepare_model_path(self.points_path)

    @staticmethod
    def dependencies_ready() -> bool:
        return hasattr(cv2, "dnn") and hasattr(cv2.dnn, "readNetFromCaffe")

    def validate_model(self) -> None:
        self._get_net()

    def _prepare_model_path(self, model_path: Path) -> Path:
        # OpenCV on Windows may fail to open model files from Unicode paths.
        try:
            str(model_path).encode("ascii")
            return model_path
        except UnicodeEncodeError:
            temp_dir = Path(tempfile.gettempdir()) / "photorestore-ai"
            temp_dir.mkdir(parents=True, exist_ok=True)
            temp_path = temp_dir / model_path.name
            if not temp_path.exists() or model_path.stat().st_mtime > temp_path.stat().st_mtime:
                shutil.copyfile(model_path, temp_path)
            return temp_path

    def _create_net(self):
        if not self.dependencies_ready():
            raise RuntimeError("cv2.dnn colorization is unavailable")

        net = cv2.dnn.readNetFromCaffe(
            str(self._opencv_proto_path),
            str(self._opencv_model_path),
        )
        points = np.load(str(self._opencv_points_path))
        points = points.transpose().reshape(2, 313, 1, 1)
        net.getLayer(net.getLayerId("class8_ab")).blobs = [
            points.astype("float32"),
        ]
        net.getLayer(net.getLayerId("conv8_313_rh")).blobs = [
            np.full([1, 313], 2.606, dtype="float32"),
        ]
        return net

    def _get_net(self):
        if self._net is None:
            self._net = self._create_net()
        return self._net

    def process(
        self,
        *,
        image: Image.Image,
        mode: str = "enhance",
        prefer_ai: bool = True,
        upscale_scale: int = 2,
    ) -> InferenceResult:
        del prefer_ai
        del upscale_scale

        mode_norm = (mode or "").strip().lower()
        if mode_norm != "colorize":
            raise ValueError("unsupported_mode")

        rgb = np.array(image.convert("RGB"), dtype=np.float32) / 255.0
        lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
        l_channel = lab[:, :, 0]
        net_input = cv2.resize(l_channel, (224, 224))
        net_input -= 50

        net = self._get_net()
        net.setInput(cv2.dnn.blobFromImage(net_input))
        ab_channels = net.forward()[0, :, :, :].transpose((1, 2, 0))
        ab_channels = cv2.resize(
            ab_channels,
            (image.width, image.height),
            interpolation=cv2.INTER_CUBIC,
        )
        colorized_lab = np.concatenate(
            (l_channel[:, :, np.newaxis], ab_channels),
            axis=2,
        )
        colorized_rgb = cv2.cvtColor(colorized_lab, cv2.COLOR_LAB2RGB)
        colorized_rgb = np.clip(colorized_rgb * 255, 0, 255).astype(np.uint8)

        return InferenceResult(
            image=Image.fromarray(colorized_rgb),
            used_ai=True,
            model_name=self.model_name,
            mode="colorize",
        )
