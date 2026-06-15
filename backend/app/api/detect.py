"""
REST detect (vong mo rong):
  POST /api/detect/image (can token, multipart 'file')
    -> 200 {"faces":[{"box":[x1,y1,x2,y2],"emotion","score"}], "width":W, "height":H}

Tai su dung EmotionPipeline qua services.inference (KHONG viet lai inference).
"""
import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.api.auth import get_current_user
from app.models.user import User
from app.services.inference import get_pipeline

router = APIRouter(prefix="/detect", tags=["detect"])


def _faces_payload(faces: list[dict]) -> list[dict]:
    """Ep ve int/float thuan de JSON hoa (giong hop dong WS)."""
    return [
        {
            "box": [int(v) for v in f["box"]],
            "emotion": f["emotion"],
            "score": round(float(f["score"]), 4),
        }
        for f in faces
    ]


@router.post("/image")
async def detect_image(
    file: UploadFile = File(...),
    current: User = Depends(get_current_user),
):
    data = await file.read()
    arr = np.frombuffer(data, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Khong doc duoc anh (file khong hop le)"
        )

    # predict() CPU-bound -> chay o threadpool
    faces = await run_in_threadpool(get_pipeline().predict, frame)
    h, w = frame.shape[:2]
    return {"faces": _faces_payload(faces), "width": int(w), "height": int(h)}
