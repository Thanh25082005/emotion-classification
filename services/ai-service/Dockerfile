FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install torch CPU-only first (much smaller than CUDA build)
RUN pip install --no-cache-dir \
    torch==2.4.1 \
    torchvision==0.19.1 \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn[standard]==0.30.6 \
    pydantic==2.9.2 \
    pydantic-settings==2.5.2 \
    python-multipart==0.0.12 \
    httpx==0.27.2 \
    ultralytics==8.3.0 \
    opencv-python-headless==4.10.0.84 \
    Pillow==10.4.0 \
    numpy==1.26.4

COPY src/ ./src/

RUN mkdir -p /app/weights

ENV PYTHONPATH=/app
ENV YOLO_MODEL_PATH=/app/weights/best.pt
ENV EMOTION_MODEL_PATH=/app/weights/efficientnet_b2_fer2013.pth
ENV DEVICE=cpu

EXPOSE 9000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "9000"]
