export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/realtime/emotions'

export const EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise'] as const

export const FRAME_INTERVAL_MS = 400
export const WS_RECONNECT_DELAY_MS = 3000
export const WS_MAX_RECONNECT_ATTEMPTS = 5
