import numpy as np
from typing import Tuple

BBox = Tuple[int, int, int, int]


def crop_face(frame: np.ndarray, bbox: BBox) -> np.ndarray:
    x1, y1, x2, y2 = bbox
    crop = frame[y1:y2, x1:x2]
    return crop
