"""
Phan tich cam xuc tren video: lay mau ~1 frame/giay (KHONG phan tich moi frame),
predict tung mau bang EmotionPipeline, tong hop timeline + summary.

Gioi han: do dai <= MAX_SECONDS giay. (Kich thuoc file kiem o tang API.)
"""
from collections import Counter

import cv2

MAX_SECONDS = 60  # gioi han do dai video (xu ly dong bo tren CPU)
DEFAULT_FPS = 25.0


def analyze_video(path: str, pipeline) -> dict:
    """
    Tra ve:
      {"frames_analyzed": N, "duration_sec": D,
       "timeline": [{"t": giay, "emotion", "score"}],
       "summary": {"counts": {...}, "dominant": "happy"|None}}
    """
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise ValueError("Khong mo duoc video (dinh dang khong ho tro)")

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    if not fps or fps <= 0:
        fps = DEFAULT_FPS
    duration = (frame_count / fps) if frame_count and frame_count > 0 else 0.0

    if duration > MAX_SECONDS:
        cap.release()
        raise ValueError(f"Video qua dai ({duration:.0f}s). Gioi han {MAX_SECONDS}s.")

    # So giay can quet: theo duration neu biet, nguoc lai quet toi da MAX_SECONDS
    last_sec = int(duration) if duration > 0 else MAX_SECONDS - 1

    timeline = []
    sampled = 0
    sec = 0
    while sec <= last_sec:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(sec * fps))
        ok, frame = cap.read()
        if not ok:
            break  # het video
        sampled += 1
        faces = pipeline.predict(frame)
        if faces:
            dom = max(faces, key=lambda f: f["score"])  # mat ro nhat
            timeline.append(
                {"t": sec, "emotion": dom["emotion"], "score": round(float(dom["score"]), 4)}
            )
        sec += 1

    cap.release()

    counts = Counter(e["emotion"] for e in timeline)
    dominant = counts.most_common(1)[0][0] if counts else None
    return {
        "frames_analyzed": sampled,
        "duration_sec": round(duration, 1),
        "timeline": timeline,
        "summary": {"counts": dict(counts), "dominant": dominant},
    }
