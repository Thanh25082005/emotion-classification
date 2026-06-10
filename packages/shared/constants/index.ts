export const EMOTION_LABELS = ['angry','disgust','fear','happy','sad','surprise','neutral'] as const;
export type EmotionLabel = typeof EMOTION_LABELS[number];

export const EMOTION_COLORS: Record<EmotionLabel, string> = {
  angry: '#ef4444', disgust: '#84cc16', fear: '#8b5cf6',
  happy: '#f59e0b', sad: '#3b82f6', surprise: '#ec4899', neutral: '#6b7280',
};

export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_SERVICE_TIMEOUT: 'AI_SERVICE_TIMEOUT',
  NO_FACE_DETECTED: 'NO_FACE_DETECTED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;
