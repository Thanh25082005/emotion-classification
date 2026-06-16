import numpy as np
from typing import List, Tuple
from ..core.config import settings
from ..core.logging import get_logger

logger = get_logger(__name__)

BBox = Tuple[int, int, int, int]  # x1, y1, x2, y2


def detect_faces(model, frame: np.ndarray) -> List[BBox]:
    results = model(frame, stream=False, conf=settings.yolo_conf_threshold, verbose=False)
    boxes: List[BBox] = []
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(frame.shape[1], x2)
            y2 = min(frame.shape[0], y2)
            if x2 > x1 and y2 > y1:
                boxes.append((x1, y1, x2, y2))
    return boxes
