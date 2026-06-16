from src.pipeline.labels import EMOTION_LABELS, TRAINING_LABELS


def test_label_count():
    assert len(EMOTION_LABELS) == 7
    assert len(TRAINING_LABELS) == 7


def test_labels_lowercase():
    for label in EMOTION_LABELS:
        assert label == label.lower()


def test_training_labels_match():
    for label in TRAINING_LABELS:
        assert label.lower() in EMOTION_LABELS
