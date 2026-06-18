"""
Pipeline nhan dien cam xuc realtime, chay LOCAL tren may tung nguoi.
Tu chon GPU NVIDIA / Intel / CPU tuy may -- cung 1 file ONNX cho ca nhom.

Cai dat tuy may:
    May CPU / Intel:    pip install onnxruntime ultralytics opencv-python numpy
    May GPU NVIDIA:     pip install onnxruntime-gpu ultralytics opencv-python numpy
                        (can CUDA/cuDNN khop voi phien ban onnxruntime-gpu)
    May Intel (toi uu): pip install onnxruntime-openvino ultralytics opencv-python numpy

Chay thu webcam:
    python realtime_emotion.py
"""
import cv2
import numpy as np
import onnxruntime as ort
from ultralytics import YOLO

# FER2013: ImageFolder sap lop theo THU TU CHU CAI cua ten thu muc.
# >>> Doi chieu voi output `print(train_dataset.classes)` luc train de chac chan thu tu nay dung <<<
EMOTIONS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]

EFFNET_INPUT = 260
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def pick_providers():
    """Tu chon execution provider theo phan cung co san, co fallback ve CPU."""
    available = ort.get_available_providers()
    preferred = ["CUDAExecutionProvider", "OpenVINOExecutionProvider", "CPUExecutionProvider"]
    chosen = [p for p in preferred if p in available]
    return chosen or ["CPUExecutionProvider"]


def softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()


def preprocess_face(face_bgr):
    """Tien xu ly KHOP voi luc train: resize 260, doi sang RGB, /255, chuan hoa ImageNet, NCHW."""
    img = cv2.resize(face_bgr, (EFFNET_INPUT, EFFNET_INPUT))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    img = (img - MEAN) / STD
    img = np.transpose(img, (2, 0, 1))[None, ...]   # (1, 3, H, W)
    return img.astype(np.float32)


class EmotionPipeline:
    def __init__(self, yolo_onnx="face_yolo.onnx", effnet_onnx="emotion_effnet.onnx", conf=0.4):
        providers = pick_providers()
        print("ONNX Runtime providers:", providers)

        # YOLO: ultralytics lo phan tien xu ly + NMS giup minh
        self.detector = YOLO(yolo_onnx)
        self.conf = conf

        # EfficientNet: chay truc tiep bang ONNX Runtime de kiem soat provider
        self.classifier = ort.InferenceSession(effnet_onnx, providers=providers)
        self.in_name = self.classifier.get_inputs()[0].name

    def predict(self, frame_bgr):
        """Tra ve list dict {box, emotion, score} cho tung khuon mat trong frame."""
        results = self.detector(frame_bgr, conf=self.conf, verbose=False)[0]
        out = []
        for box in results.boxes.xyxy.cpu().numpy().astype(int):
            x1, y1, x2, y2 = box
            face = frame_bgr[max(0, y1):y2, max(0, x1):x2]
            if face.size == 0:
                continue
            logits = self.classifier.run(None, {self.in_name: preprocess_face(face)})[0][0]
            probs = softmax(logits)
            idx = int(np.argmax(probs))
            out.append({"box": (x1, y1, x2, y2),
                        "emotion": EMOTIONS[idx],
                        "score": float(probs[idx])})
        return out


def run_webcam(process_every=3):
    """Demo nhanh bang webcam. process_every: chi chay model moi N frame de nhe CPU."""
    pipe = EmotionPipeline()
    cap = cv2.VideoCapture(0)
    last_dets, frame_id = [], 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frame_id += 1
        if frame_id % process_every == 0:
            last_dets = pipe.predict(frame)

        for d in last_dets:
            x1, y1, x2, y2 = d["box"]
            label = f'{d["emotion"]} {d["score"]:.2f}'
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 200, 0), 2)
            cv2.putText(frame, label, (x1, max(0, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 0), 2)

        cv2.imshow("Emotion - nhan q de thoat", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    run_webcam()
