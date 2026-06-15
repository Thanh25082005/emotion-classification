"""
REST detect (vong mo rong):
  POST /api/detect/image (can token, multipart 'file')
    -> 200 {"faces":[{"box":[x1,y1,x2,y2],"emotion","score"}], "width":W, "height":H}

Tai su dung EmotionPipeline qua services.inference (KHONG viet lai inference).
"""
import os
import tempfile

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.api.auth import get_current_user
from app.models.user import User
from app.services.inference import get_pipeline
from app.services.video import analyze_video

router = APIRouter(prefix="/detect", tags=["detect"])

MAX_VIDEO_BYTES = 50 * 1024 * 1024  # 50MB


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


@router.post("/video")
async def detect_video(
    file: UploadFile = File(...),
    current: User = Depends(get_current_user),
):
    data = await file.read()
    if len(data) > MAX_VIDEO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Video qua lon (toi da 50MB)",
        )

    # OpenCV can file tren dia -> ghi ra file tam
    suffix = os.path.splitext(file.filename or "")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        # Phan tich dong bo (co the lau) -> chay o threadpool
        result = await run_in_threadpool(analyze_video, tmp_path, get_pipeline())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    finally:
        os.unlink(tmp_path)

    return result
