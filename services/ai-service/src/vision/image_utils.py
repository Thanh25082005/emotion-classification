import cv2
import numpy as np
from PIL import Image


def bgr_to_pil(bgr_img: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def validate_image_size(img: np.ndarray, min_size: int = 10) -> bool:
    h, w = img.shape[:2]
    return h >= min_size and w >= min_size
