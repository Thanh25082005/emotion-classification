"""
Kiem tra Phase 1: chay EmotionPipeline.predict() tren 1 anh mau (khong can webcam).
In ra provider dang dung + danh sach khuon mat (box, emotion, score).

Cach dung:
    python ai-service/test_image.py                 # dung anh mau zidane.jpg cua ultralytics
    python ai-service/test_image.py duong_dan.jpg   # dung anh tu chon
"""
import os
import sys

import cv2

# Cho phep chay tu bat ky thu muc nao -- them thu muc nay vao sys.path
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from realtime_emotion import EmotionPipeline  # noqa: E402

YOLO_ONNX = os.path.join(HERE, "models", "face_yolo.onnx")
EFFNET_ONNX = os.path.join(HERE, "models", "emotion_effnet.onnx")


def main():
    # Anh dau vao: tham so dong lenh, hoac anh mau zidane.jpg di kem ultralytics
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
    else:
        from ultralytics.utils import ASSETS
        img_path = str(ASSETS / "zidane.jpg")

    frame = cv2.imread(img_path)
    if frame is None:
        raise SystemExit(f"Khong doc duoc anh: {img_path}")
    print(f"Anh test: {img_path}  (shape={frame.shape})")

    pipe = EmotionPipeline(yolo_onnx=YOLO_ONNX, effnet_onnx=EFFNET_ONNX)
    faces = pipe.predict(frame)

    print(f"\nSo khuon mat phat hien: {len(faces)}")
    for i, f in enumerate(faces):
        print(f"  [{i}] box={f['box']}  emotion={f['emotion']}  score={f['score']:.3f}")

    if not faces:
        print("CANH BAO: khong phat hien khuon mat nao trong anh.")


if __name__ == "__main__":
    main()
