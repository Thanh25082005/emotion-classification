# Hệ thống nhận diện cảm xúc realtime

Phát hiện khuôn mặt + phân loại cảm xúc theo thời gian thực từ webcam, kèm đăng nhập và lưu lịch sử cảm xúc.

- **Pipeline AI:** YOLO (phát hiện mặt) → cắt vùng mặt → EfficientNet-B2 (7 cảm xúc FER2013), cả hai chạy bằng **ONNX Runtime**.
- **Kiến trúc:** monolith chạy local. Frontend (Vite/React) ↔ Backend (FastAPI) qua `localhost`. **Inference nằm trong cùng tiến trình backend** — gọi hàm trực tiếp, không qua mạng.
- **Chọn phần cứng tự động:** NVIDIA → CUDA, Intel → OpenVINO, còn lại → CPU. Cùng một file `.onnx` chạy được trên mọi máy.
- **CSDL:** SQLite — một file, không cần server.

> Hoàn toàn local, một máy, không cần GPU NVIDIA.

---

## 1. Yêu cầu môi trường

| | Phiên bản |
|---|---|
| Python | 3.12 |
| Node.js | ≥ 18 |
| Docker + Compose | Tùy chọn |

---

## 2. Cấu trúc thư mục

```
CV_project/
├── ai-service/
│   ├── realtime_emotion.py        # class EmotionPipeline — lõi inference
│   ├── export_to_onnx.py          # xuất .pt/.pth → .onnx (chạy 1 lần)
│   ├── test_image.py              # kiểm tra predict() trên ảnh tĩnh
│   ├── notebooks/
│   │   ├── yolo-dectection.ipynb       # train YOLOv8n (WIDER FACE)
│   │   └── efficientnet-b02.ipynb      # train EfficientNet-B2 (FER2013)
│   └── models/
│       ├── best.pt                     # YOLO weights gốc (PyTorch)
│       ├── efficientnet_b2_fer2013.pth # EfficientNet weights gốc (PyTorch)
│       ├── face_yolo.onnx              # YOLO đã export (dùng khi chạy)
│       ├── emotion_effnet.onnx         # EfficientNet đã export (dùng khi chạy)
│       ├── emotion_effnet.onnx.data    # external data đi kèm file trên
│       └── _source/                    # tài liệu từ repo nguồn (không chạy)
├── backend/
│   ├── app/                       # FastAPI: api/, websocket/, services/, core/, db/, models/, schemas/
│   ├── tests/test_basic.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/                       # React: pages/, components/, services/, stores/, routes/
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## 3. Tài sản AI & xuất ONNX

Repo đã kèm 2 file weights gốc trong `ai-service/models/`. Chạy lệnh sau để tạo (hoặc tạo lại) file `.onnx`:

```bash
pip install ultralytics torch torchvision onnx onnxscript

python ai-service/export_to_onnx.py \
  --yolo ai-service/models/best.pt \
  --effnet ai-service/models/efficientnet_b2_fer2013.pth \
  --yolo-out ai-service/models/face_yolo.onnx \
  --effnet-out ai-service/models/emotion_effnet.onnx
```

> **Lưu ý:** EfficientNet xuất ra dạng *external data* — `emotion_effnet.onnx` + `emotion_effnet.onnx.data`. **Hai file phải luôn cùng thư mục.**

### Huấn luyện model (notebooks)

| Notebook | Model | Dataset | Cấu hình chính | Output |
|---|---|---|---|---|
| `yolo-dectection.ipynb` | YOLOv8n (1 lớp `face`) | WIDER FACE (~12.880 ảnh, split 80/10/10) | 50 epochs, imgsz 640, batch 16, AdamW, cos_lr | `best.pt` |
| `efficientnet-b02.ipynb` | EfficientNet-B2 (pretrained ImageNet, head Dropout 0.5 + Linear 7) | FER2013 (ImageFolder, 7 lớp) | Resize 260, chuẩn hoá ImageNet, Adam, ReduceLROnPlateau, EarlyStopping | `efficientnet_b2_fer2013.pth` |

> **Quan trọng — thứ tự nhãn:** EfficientNet dùng `ImageFolder`, thứ tự lớp theo bảng chữ cái tên thư mục. Phải khớp với `EMOTIONS` trong `realtime_emotion.py`: `["angry","disgust","fear","happy","neutral","sad","surprise"]`.

Luồng đầy đủ: **notebook → `.pt`/`.pth` → `export_to_onnx.py` → `.onnx` → inference**.

Kiểm tra nhanh lõi AI (không cần webcam):

```bash
pip install onnxruntime ultralytics opencv-python numpy
python ai-service/test_image.py            # ảnh mẫu
python ai-service/test_image.py anh.jpg    # ảnh của bạn
```

---

## 4. Cài backend theo loại máy

`requirements.txt` mặc định dùng **`onnxruntime` (CPU)** — chạy được trên mọi máy. Tùy phần cứng, gỡ rồi cài đúng biến thể; mã tự fallback CPU nếu provider không khả dụng.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # đổi SECRET_KEY thành chuỗi ngẫu nhiên
```

| Loại máy | Gói cần cài |
|---|---|
| CPU thường | `onnxruntime` (có sẵn trong requirements) |
| Intel (tối ưu) | `pip uninstall onnxruntime && pip install onnxruntime-openvino` |
| NVIDIA GPU | `pip uninstall onnxruntime && pip install onnxruntime-gpu` (cần CUDA/cuDNN khớp phiên bản) |

### Chạy backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
# health: http://localhost:8000/api/health  →  {"status":"ok"}
```

Lần đầu khởi động sẽ tạo bảng SQLite và nạp 2 model một lần. Log sẽ in `ONNX Runtime providers: [...]` cho biết provider đang dùng.

---

## 5. Chạy frontend

```bash
cd frontend
npm install
cp .env.example .env       # chỉ cần nếu đổi địa chỉ backend
npm run dev                # http://localhost:5173
```

Mở `http://localhost:5173` → đăng ký → đăng nhập → vào `/live` → cấp quyền webcam → khuôn mặt được khoanh + nhãn cảm xúc realtime. Vào `/history` để xem biểu đồ thống kê.

---

## 6. Chạy bằng Docker Compose

Webcam chạy ở trình duyệt trên máy host nên không cần gắn thiết bị vào container.

```bash
export SECRET_KEY="chuoi-ngau-nhien-dai"
docker compose up --build
# Frontend: http://localhost:5173   |   Backend: http://localhost:8000
```

> Image backend mặc định dùng onnxruntime **CPU**. Muốn GPU/Intel: sửa `onnxruntime` trong `backend/requirements.txt` rồi `docker compose build`.

---

## 7. Hợp đồng giao tiếp

### REST (prefix `/api`)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/health` | `{"status":"ok"}` |
| POST | `/api/auth/register` | `{username, password}` → `201 {id, username}` \| `409` trùng tên |
| POST | `/api/auth/login` | `{username, password}` → `200 {access_token, token_type}` \| `401` |
| GET | `/api/auth/me` | `Authorization: Bearer <token>` → `200 {id, username}` |
| GET | `/api/logs/stats` | (cần token) → `200 {"counts":{...}, "total": N}` |

### WebSocket

- URL: `ws://localhost:8000/ws/emotion?token=<JWT>`
  - Token truyền qua query param vì trình duyệt không set được header `Authorization` trên WebSocket.
  - Token sai/thiếu → đóng kết nối **code 1008**.
- **Client → Server:** binary = ảnh JPEG một frame (client tự throttle ~5–8 fps).
- **Server → Client:** text JSON:
  ```json
  {"faces":[{"box":[x1,y1,x2,y2],"emotion":"happy","score":0.93}],"ts":1718000000000}
  ```

### Database (SQLite)

- `users(id, username UNIQUE, password_hash, created_at)`
- `emotion_logs(id, user_id FK, ts, emotion, confidence)` — ghi tối đa ~1 bản ghi/2 giây, cảm xúc nổi trội của khoảng đó.

---

## 8. Test

```bash
# Test cơ bản (tự nạp model): health + auth + websocket
cd backend && python -m pytest -v

# Script test thủ công (cần backend đang chạy ở cổng 8000)
python backend/test_ws_client.py    # gửi 1 ảnh qua WS, kiểm tra JSON trả về
python backend/test_auth.py         # register / login / me + WS 1008
python backend/test_logs.py         # ghi log + /logs/stats
```

---

## 9. Lưu ý kỹ thuật

1. **Thứ tự nhãn cảm xúc** phải khớp `train_dataset.classes` lúc train. FER2013 (ImageFolder, theo bảng chữ cái): `["angry","disgust","fear","happy","neutral","sad","surprise"]`. Nếu lệch → model đoán đúng nhưng gán sai tên.
2. **Tiền xử lý EfficientNet** (resize 260, BGR→RGB, /255, chuẩn hóa ImageNet, NCHW) phải khớp lúc train — đã đúng trong `EmotionPipeline`, đừng sửa.
3. **JWT trên WebSocket** truyền qua query param.
4. **CORS** cho phép origin `http://localhost:5173` — cấu hình `CORS_ORIGINS` trong `.env`.
5. **Model chỉ nạp 1 lần** lúc khởi động backend, không nạp lại mỗi request/kết nối.
6. **Throttle fps ở client** ~5–8 fps. Gửi 30 fps sẽ nghẽn trên máy CPU.

## 10. Xử lý sự cố

| Triệu chứng | Nguyên nhân / cách sửa |
|---|---|
| `ModuleNotFoundError: onnxscript` khi export | `pip install onnxscript` |
| WS không kết nối / 1008 | Chưa đăng nhập hoặc token hết hạn — đăng nhập lại |
| `bcrypt` lỗi version với passlib | Giữ `bcrypt==4.0.1` như trong `requirements.txt` |
| Không thấy box trên webcam | Kiểm tra provider trong log; hạ `CONF` trong `.env`; đảm bảo đủ ánh sáng |
| Webcam không bật | Trình duyệt cần `localhost` (hoặc HTTPS) và được cấp quyền camera |
