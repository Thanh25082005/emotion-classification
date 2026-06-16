import os
import cv2
import torch
import torch.nn as nn
from pathlib import Path
from torchvision import transforms
from PIL import Image
from ultralytics import YOLO

# =====================================================================
# 1. CẤU HÌNH THIẾT BỊ VÀ ĐƯỜNG DẪN TRỌNG SỐ (LOCAL)
# =====================================================================
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"--> Đang sử dụng thiết bị: {DEVICE}")

# Weights are stored under services/ai-service/weights/
REPO_ROOT       = Path(__file__).resolve().parent.parent
WEIGHTS_DIR     = REPO_ROOT / "services" / "ai-service" / "weights"
YOLO_WEIGHTS    = WEIGHTS_DIR / "best.pt"
EMOTION_WEIGHTS = WEIGHTS_DIR / "efficientnet_b2_fer2013.pth"

NUM_CLASSES = 7
EMOTION_LABELS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']

# =====================================================================
# 2. ĐỊNH NGHĨA VÀ TẢI MODEL EFFICIENTNET-B2
# =====================================================================
def load_emotion_model(weights_path, device):
    from torchvision import models
    # Khởi tạo cấu trúc mô hình (weights=None để tránh tự động tải bản pre-train khác)
    model = models.efficientnet_b2(weights=None)
    
    # Định nghĩa lại lớp Classifier giống hệt cấu trúc lúc huấn luyện
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Sequential(
        nn.Dropout(p=0.5, inplace=True),
        nn.Linear(in_features, NUM_CLASSES)
    )
    
    # Nạp trọng số từ file .pth local của bạn
    if os.path.exists(weights_path):
        model.load_state_dict(torch.load(weights_path, map_location=device))
        print(f"--> Tải thành công trọng số Emotion Model: {weights_path}")
    else:
        raise FileNotFoundError(f"Không tìm thấy file trọng số {weights_path}! Hãy tải từ Kaggle về thư mục này.")
        
    model = model.to(device)
    model.eval()  # Chuyển sang chế độ Inference (đánh giá)
    return model

# Pipeline tiền xử lý ảnh cho EfficientNet-B2 (Kích thước 260x260 theo chuẩn B2)
data_transforms = transforms.Compose([
    transforms.Resize((260, 260)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# =====================================================================
# 3. LUỒNG CHẠY PIPELINE REAL-TIME VIA CAMERA
# =====================================================================
def main():
    # Tải Model 1: YOLO Face Detector
    # (Nếu chưa có file pt, Ultralytics sẽ tự tải bản mặc định về thư mục hiện tại)
    print("--> Đang khởi tạo YOLO Face Detector...")
    face_detector = YOLO(YOLO_WEIGHTS)
    
    # Tải Model 2: EfficientNet-B2 Emotion Classifier
    print("--> Đang khởi tạo EfficientNet-B2 Emotion Classifier...")
    emotion_model = load_emotion_model(EMOTION_WEIGHTS, DEVICE)
    
    # Khởi tạo kết nối với Camera local
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[LỖI] Không thể mở được Camera. Vui lòng kiểm tra lại thiết bị.")
        return

    print("\n=== PIPELINE ĐÃ SẴN SÀNG - NHẤN 'q' ĐỂ THOÁT KHỎI CHƯƠNG TRÌNH ===")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("[CẢNH BÁO] Không nhận được luồng dữ liệu từ Camera.")
            break
            
        # Model 1: Dự đoán vị trí khuôn mặt bằng YOLO
        # stream=True giúp tối ưu hóa bộ nhớ RAM/VRAM khi xử lý video real-time
        results = face_detector(frame, stream=True, conf=0.5, verbose=False)
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Lấy tọa độ Bounding Box (x1, y1, x2, y2) và ép kiểu int
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                # Tránh lỗi tọa độ vượt quá biên màn hình (out of bounds)
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
                
                # Cắt vùng khuôn mặt (Crop ROI)
                crop_face = frame[y1:y2, x1:x2]
                if crop_face.size == 0: 
                    continue
                
                # Chuyển đổi định dạng ảnh từ BGR (OpenCV) sang RGB (PyTorch)
                roi_rgb = cv2.cvtColor(crop_face, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(roi_rgb)
                
                # Thực hiện Transform và thêm chiều Batch size (unsqueeze(0))
                input_tensor = data_transforms(pil_img).unsqueeze(0).to(DEVICE)
                
                # Model 2: Nhận diện cảm xúc từ vùng khuôn mặt vừa cắt
                with torch.no_grad():
                    outputs = emotion_model(input_tensor)
                    _, preds = torch.max(outputs, 1)
                    emotion_idx = preds.item()
                    emotion_text = EMOTION_LABELS[emotion_idx]
                
                # Vẽ hộp bọc khuôn mặt màu xanh cyan (255, 255, 0)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 255, 0), 2)
                
                # Hiển thị text cảm xúc lên phía trên hộp bọc
                label_y = y1 - 10 if y1 - 10 > 10 else y1 + 20
                cv2.putText(frame, emotion_text, (x1, label_y), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2, cv2.LINE_AA)
                
        # Hiển thị cửa sổ kết quả màn hình
        cv2.imshow("Real-time Face Emotion Pipeline", frame)
        
        # Bắt phím 'q' để dừng vòng lặp
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
            
    # Giải phóng camera và đóng toàn bộ cửa sổ
    cap.release()
    cv2.destroyAllWindows()
    print("--> Đã tắt Pipeline thành công.")

if __name__ == '__main__':
    main()
