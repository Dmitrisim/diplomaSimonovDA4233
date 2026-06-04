from __future__ import annotations

import cv2
import numpy as np

from backend.app.processing.filters import restore_image


def _channel_spread(image_bgr: np.ndarray) -> float:
    return float(
        np.mean(
            np.max(image_bgr, axis=2).astype(np.float32)
            - np.min(image_bgr, axis=2).astype(np.float32),
        ),
    )


def test_restore_image_normalizes_archival_tone() -> None:
    image = np.full((120, 90, 3), (82, 112, 152), dtype=np.uint8)
    cv2.rectangle(image, (20, 18), (70, 102), (45, 62, 78), -1)
    cv2.circle(image, (36, 46), 3, (12, 14, 18), -1)
    cv2.circle(image, (54, 46), 3, (12, 14, 18), -1)
    cv2.line(image, (8, 15), (82, 98), (220, 210, 190), 1)

    restored = restore_image(image)

    assert restored.shape == image.shape
    assert np.mean(cv2.absdiff(image, restored)) > 3
    assert _channel_spread(restored) < _channel_spread(image)
