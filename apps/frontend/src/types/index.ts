export interface EmotionScores {
  angry: number
  disgust: number
  fear: number
  happy: number
  neutral: number
  sad: number
  surprise: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FaceResult {
  face_id: string
  box?: BoundingBox
  emotion: string
  confidence: number
  scores: EmotionScores
}

export interface EmotionResult {
  id: string
  user_id: string
  source_type: string
  faces: FaceResult[]
  dominant_emotion: string
  confidence: number
  processing_time_ms?: number
  created_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  can_upload: boolean
  created_at: string
}

export interface ApiError {
  code: string
  message: string
}

export type ServiceStatus = 'online' | 'offline' | 'unknown'
