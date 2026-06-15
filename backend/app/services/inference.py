"""
Boc EmotionPipeline thanh singleton: nap model MOT LAN luc app khoi dong,
KHONG nap lai moi request/ket noi (gotcha #7).

Tai su dung truc tiep class EmotionPipeline trong ai-service/realtime_emotion.py
-- KHONG viet lai logic inference.
"""
import sys

from app.core.config import AI_SERVICE_DIR, settings

# Cho phep import module loi AI nam ngoai package backend
sys.path.insert(0, str(AI_SERVICE_DIR))

from realtime_emotion import EmotionPipeline  # noqa: E402

_pipeline: EmotionPipeline | None = None


def init_pipeline() -> EmotionPipeline:
    """Nap pipeline 1 lan (goi trong lifespan luc startup)."""
    global _pipeline
    if _pipeline is None:
        _pipeline = EmotionPipeline(
            yolo_onnx=settings.YOLO_ONNX,
            effnet_onnx=settings.EFFNET_ONNX,
            conf=settings.CONF,
        )
    return _pipeline


def get_pipeline() -> EmotionPipeline:
    """Lay pipeline da nap. Loi neu chua init (sai vong doi app)."""
    if _pipeline is None:
        raise RuntimeError("EmotionPipeline chua duoc khoi tao. Goi init_pipeline() luc startup.")
    return _pipeline
