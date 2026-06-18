// Nguon duy nhat ve cam xuc: thu tu (khop EMOTIONS backend), mau (hex), emoji, nhan.
// Dung chung cho canvas overlay, bieu do, badge -> mau nhat quan toan he thong.

export const EMOTIONS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

export const EMOTION_META = {
  happy: { label: 'Happy', emoji: '😊', color: '#f59e0b' },
  sad: { label: 'Sad', emoji: '😢', color: '#3b82f6' },
  angry: { label: 'Angry', emoji: '😠', color: '#ef4444' },
  fear: { label: 'Fear', emoji: '😨', color: '#a78bfa' },
  surprise: { label: 'Surprise', emoji: '😮', color: '#fb923c' },
  disgust: { label: 'Disgust', emoji: '🤢', color: '#22c55e' },
  neutral: { label: 'Neutral', emoji: '😐', color: '#94a3b8' },
}

export function emoColor(name) {
  return EMOTION_META[name]?.color || '#94a3b8'
}

export function emoEmoji(name) {
  return EMOTION_META[name]?.emoji || '🙂'
}

export function emoLabel(name) {
  return EMOTION_META[name]?.label || name
}
