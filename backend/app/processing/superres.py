from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


@dataclass(frozen=True)
class SuperResolutionResult:
    image_bgr: np.ndarray
    used_ai: bool
    model_name: str | None


def _has_dnn_superres() -> bool:
    return hasattr(cv2, "dnn_superres") and hasattr(cv2.dnn_superres, "DnnSuperResImpl_create")


def try_super_resolve(image_bgr: np.ndarray, models_dir: Path) -> SuperResolutionResult:
    model_path = models_dir / "EDSR_x2.pb"
    if not model_path.exists():
        return SuperResolutionResult(image_bgr=image_bgr, used_ai=False, model_name=None)
    if not _has_dnn_superres():
        return SuperResolutionResult(image_bgr=image_bgr, used_ai=False, model_name=None)

    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    sr.readModel(str(model_path))
    sr.setModel("edsr", 2)

    out = sr.upsample(image_bgr)
    return SuperResolutionResult(image_bgr=out, used_ai=True, model_name="EDSR_x2.pb")
