import torch
from PIL import Image
from torchvision import transforms

_transform = transforms.Compose([
    transforms.Resize((260, 260)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def preprocess_face(pil_img: Image.Image, device: str = "cpu") -> torch.Tensor:
    tensor = _transform(pil_img).unsqueeze(0).to(device)
    return tensor
