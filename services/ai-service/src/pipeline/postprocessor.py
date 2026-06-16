import torch
import torch.nn.functional as F
from typing import Tuple, Dict
from .labels import EMOTION_LABELS


def compute_scores(logits: torch.Tensor) -> Tuple[str, float, Dict[str, float]]:
    probs = F.softmax(logits, dim=1).squeeze(0)
    scores = {EMOTION_LABELS[i]: float(probs[i]) for i in range(len(EMOTION_LABELS))}
    emotion = max(scores, key=lambda k: scores[k])
    confidence = scores[emotion]
    return emotion, confidence, scores
