"""
Xuất 2 model (.pt / .pth) sang ONNX để chạy được trên mọi máy trong nhóm.
Chạy MỘT LẦN sau khi train xong, rồi commit 2 file .onnx vào repo (hoặc đặt ở models/).

Cài đặt:
    pip install ultralytics torch torchvision onnx

Cách dùng:
    python export_to_onnx.py \
        --yolo runs/detect/train/weights/best.pt \
        --effnet efficientnet_b2_fer2013.pth
"""
import argparse
import shutil

import torch
import torch.nn as nn
from torchvision import models

NUM_CLASSES = 7
EFFNET_INPUT = 260   # khớp với Resize((260, 260)) lúc train
OPSET = 13           # opset an toàn cho nhiều execution provider (CUDA / OpenVINO / CPU)


def export_yolo(pt_path: str, out_path: str, imgsz: int = 640):
    """YOLO: dùng ultralytics export, nó tự nhúng tiền xử lý + NMS vào pipeline khi chạy.
    imgsz nhỏ hơn (vd 384) -> detect nhanh hơn nhiều trên CPU, đổi lại độ chính xác giảm nhẹ."""
    from ultralytics import YOLO

    model = YOLO(pt_path)
    exported = model.export(format="onnx", opset=OPSET, dynamic=False,
                            simplify=True, imgsz=imgsz)
    if str(exported) != out_path:
        shutil.move(str(exported), out_path)
    print(f"[YOLO] da xuat: {out_path}")


def build_efficientnet() -> nn.Module:
    """Dung lai DUNG kien truc nhu luc train de load duoc trong so."""
    model = models.efficientnet_b2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Sequential(
        nn.Dropout(p=0.5, inplace=True),
        nn.Linear(in_features, NUM_CLASSES),
    )
    return model


def export_efficientnet(pth_path: str, out_path: str):
    model = build_efficientnet()
    state = torch.load(pth_path, map_location="cpu")
    model.load_state_dict(state)
    model.eval()

    dummy = torch.randn(1, 3, EFFNET_INPUT, EFFNET_INPUT)
    torch.onnx.export(
        model, dummy, out_path,
        input_names=["input"], output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=OPSET,
    )
    print(f"[EfficientNet] da xuat: {out_path}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--yolo", default="best.pt",
                   help="duong dan YOLO .pt (vd: runs/detect/train/weights/best.pt)")
    p.add_argument("--effnet", default="efficientnet_b2_fer2013.pth")
    p.add_argument("--yolo-out", default="face_yolo.onnx")
    p.add_argument("--effnet-out", default="emotion_effnet.onnx")
    p.add_argument("--imgsz", type=int, default=640, help="kich thuoc dau vao YOLO (vd 384 cho nhanh)")
    args = p.parse_args()

    export_yolo(args.yolo, args.yolo_out, imgsz=args.imgsz)
    export_efficientnet(args.effnet, args.effnet_out)
    print("Xong. Hai file .onnx nay chay duoc tren CPU, GPU NVIDIA, va Intel.")
