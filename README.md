# Hệ thống nhận diện cảm xúc realtime

Phát hiện khuôn mặt + phân loại cảm xúc theo thời gian thực từ webcam, kèm đăng nhập và lưu lịch sử cảm xúc.

- **Pipeline AI:** YOLO (phát hiện mặt) → cắt vùng mặt → EfficientNet-B2 (7 cảm xúc FER2013), cả hai chạy bằng **ONNX**.
- **Kiến trúc:** monolith **chạy local trên từng máy**. Frontend (Vite/React) ↔ Backend (FastAPI) qua `localhost`. **Inference nằm trong cùng tiến trình backend** (gọi hàm trực tiếp, không qua mạng).
- **Chọn phần cứng tự động:** mã tự chọn execution provider (NVIDIA → CUDA, Intel → OpenVINO, còn lại → CPU) và **fallback CPU**. Cùng một file `.onnx` chạy được trên mọi máy.
- **CSDL:** SQLite (một file, không cần server).

> Hoàn toàn local, một máy, **không cần GPU NVIDIA**.

---

## 1. Yêu cầu môi trường

- **Python 3.12**
- **Node.js ≥ 18**
- (Tùy chọn) Docker + Docker Compose

## 2. Cấu trúc thư mục

```
CV_project/
├── ai-service/
│   ├── realtime_emotion.py        # class EmotionPipeline + pick_providers() — LÕI inference
│   ├── export_to_onnx.py          # xuất .pt/.pth -> .onnx (chạy 1 lần)
│   ├── test_image.py              # chạy thử predict() trên 1 ảnh (không cần webcam)
│   └── models/
│       ├── face_yolo.onnx
│       ├── emotion_effnet.onnx (+ emotion_effnet.onnx.data)
├── backend/
│   ├── app/                       # FastAPI: api/, websocket/, services/, core/, db/, models/, schemas/
│   ├── tests/test_basic.py        # test health + auth + websocket
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/                       # React: pages/, components/, services/, stores/, routes/
│   ├── package.json
│   └── .env.example
├── best.pt, efficientnet_b2_fer2013.pth   # weights gốc (đầu vào để export ONNX)
├── docker-compose.yml
└── README.md
```

---

## 3. Tài sản AI & xuất ONNX

Repo đã kèm 2 file ONNX trong `ai-service/models/`. Nếu cần **xuất lại** từ weights gốc:

```bash
pip install ultralytics torch torchvision onnx onnxscript
python ai-service/export_to_onnx.py \
  --yolo best.pt \
  --effnet efficientnet_b2_fer2013.pth \
  --yolo-out ai-service/models/face_yolo.onnx \
  --effnet-out ai-service/models/emotion_effnet.onnx
```

> **Lưu ý:** với PyTorch 2.x, `torch.onnx.export` cần thêm gói **`onnxscript`**. EfficientNet xuất ra dạng *external data* (`emotion_effnet.onnx` + `emotion_effnet.onnx.data`) — **hai file phải luôn đi cùng thư mục**.

Kiểm tra nhanh lõi AI (không cần webcam):

```bash
pip install onnxruntime ultralytics opencv-python numpy
python ai-service/test_image.py            # ảnh mẫu
python ai-service/test_image.py anh.jpg    # ảnh của bạn
```

---

## 4. Cài backend **theo loại máy** (quan trọng)

`backend/requirements.txt` mặc định dùng **`onnxruntime` (CPU)** — chạy được trên mọi máy. Tùy phần cứng, **gỡ rồi cài đúng biến thể** để tăng tốc; mã sẽ tự fallback CPU nếu provider không khả dụng (không cần sửa code).

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # rồi đổi SECRET_KEY thành chuỗi ngẫu nhiên
```

| Loại máy | Cài onnxruntime | Ghi chú |
|---|---|---|
| **CPU thường** | `onnxruntime` (đã có sẵn trong requirements) | dùng `CPUExecutionProvider` |
| **Intel (tối ưu)** | `pip uninstall onnxruntime && pip install onnxruntime-openvino` | dùng `OpenVINOExecutionProvider` |
| **NVIDIA GPU** | `pip uninstall onnxruntime && pip install onnxruntime-gpu` | **phải khớp CUDA/cuDNN** với bản onnxruntime-gpu (xem bảng tương thích của ONNX Runtime) |

> Tuyệt đối **không hardcode CUDA** — việc chọn provider đi qua `pick_providers()` trong `ai-service/realtime_emotion.py`. Khi chạy, log sẽ in `ONNX Runtime providers: [...]` cho biết provider đang dùng.

### Chạy backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
# health: http://localhost:8000/api/health  ->  {"status":"ok"}
```

Lần đầu khởi động sẽ **tạo bảng SQLite** và **nạp 2 model một lần** (gotcha: model chỉ nạp 1 lần, không nạp lại mỗi request).

---

## 5. Chạy frontend

```bash
cd frontend
npm install
cp .env.example .env        # chỉ cần nếu đổi địa chỉ backend
npm run dev                 # http://localhost:5173
```

Mở `http://localhost:5173` → bị chuyển sang `/login` → **đăng ký → đăng nhập** → vào `/live` → **cấp quyền webcam** → thấy khuôn mặt được khoanh + nhãn cảm xúc realtime. Vào `/history` để xem biểu đồ thống kê.

---

## 6. Chạy bằng Docker Compose (tùy chọn)

Webcam chạy ở **trình duyệt trên máy host** nên không cần gắn thiết bị vào container. Backend mount thư mục `ai-service/models`.

```bash
# (khuyến nghị) đặt SECRET_KEY
export SECRET_KEY="chuoi-ngau-nhien-dai"
docker compose up --build
# Frontend: http://localhost:5173   |   Backend: http://localhost:8000
```

> Image backend mặc định dùng onnxruntime **CPU**. Muốn GPU/Intel: sửa `backend/requirements.txt` (đổi `onnxruntime` sang biến thể tương ứng) rồi `docker compose build`.

---

## 7. Hợp đồng giao tiếp

### REST (prefix `/api`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/health` | `{"status":"ok"}` |
| POST | `/api/auth/register` | body `{username,password}` → `201 {id,username}` \| `409` nếu trùng |
| POST | `/api/auth/login` | body `{username,password}` → `200 {access_token,token_type:"bearer"}` \| `401` |
| GET | `/api/auth/me` | header `Authorization: Bearer <token>` → `200 {id,username}` \| `401` |
| GET | `/api/logs/stats` | (cần token) → `200 {"counts":{...},"total":N}` |

### WebSocket
- URL: `ws://localhost:8000/ws/emotion?token=<JWT>` (token qua **query param** vì WS trình duyệt không set được header `Authorization`). Token sai/thiếu → đóng kết nối **code 1008**.
- **Client → Server:** mỗi message là **binary** = ảnh JPEG một frame (client tự throttle ~5–8 fps).
- **Server → Client:** mỗi message là **text JSON**:
  ```json
  {"faces":[{"box":[x1,y1,x2,y2],"emotion":"happy","score":0.93}],"ts":1718000000000}
  ```
  Tọa độ `box` theo kích thước frame gốc client gửi lên.

### Database (SQLite)
- `users(id, username UNIQUE, password_hash, created_at)`
- `emotion_logs(id, user_id FK, ts, emotion, confidence)` — ghi **theo mẫu**, tối đa ~1 bản ghi/2 giây cho mỗi kết nối (cảm xúc nổi trội của khoảng).

---

## 8. Test

```bash
# Test cơ bản (in-process, tự nạp model): health + auth + websocket
cd backend && python -m pytest -v

# Các script test thủ công (cần backend đang chạy ở cổng 8000):
python backend/test_ws_client.py    # gửi 1 ảnh qua WS, kiểm tra định dạng JSON
python backend/test_auth.py         # register/login/me + WS 1008/JSON
python backend/test_logs.py         # ghi log theo mẫu + /logs/stats
```

---

## 9. Lưu ý kỹ thuật (gotchas)

1. **Thứ tự nhãn cảm xúc** trong `realtime_emotion.py` phải khớp `train_dataset.classes` lúc train. Mặc định FER2013 (ImageFolder, theo bảng chữ cái): `["angry","disgust","fear","happy","neutral","sad","surprise"]`. Nếu lệch, model đoán đúng nhưng gán **sai tên**.
2. **Tiền xử lý EfficientNet** (resize 260, BGR→RGB, /255, chuẩn hóa ImageNet, NCHW) phải khớp lúc train — đã đúng trong `EmotionPipeline`, **đừng sửa**.
3. **Chọn provider + fallback CPU** qua `pick_providers()`. Không hardcode CUDA.
4. **Throttle fps ở client** (~5–8 fps). Gửi 30 fps sẽ nghẽn, nhất là máy CPU.
5. **JWT trên WebSocket** truyền qua query param (trình duyệt không set được header WS).
6. **CORS**: backend cho phép origin `http://localhost:5173` (cấu hình `CORS_ORIGINS` trong `.env`).
7. **Nạp model một lần** lúc khởi động backend, không nạp lại mỗi request/kết nối.

## 10. Xử lý sự cố

- **`ModuleNotFoundError: onnxscript`** khi export: `pip install onnxscript`.
- **WS không kết nối / 1008**: chưa đăng nhập hoặc token hết hạn — đăng nhập lại.
- **`bcrypt` lỗi version với passlib**: giữ `bcrypt==4.0.1` như trong `requirements.txt`.
- **Không thấy box**: kiểm tra log backend in provider; thử hạ ngưỡng `CONF` trong `.env`; đảm bảo đủ ánh sáng/khuôn mặt rõ.
- **Webcam không bật**: trình duyệt cần `localhost` (hoặc HTTPS) và bạn phải cấp quyền camera.
