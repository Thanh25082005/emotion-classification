export interface EmotionScore {
  angry: number;
  disgust: number;
  fear: number;
  happy: number;
  sad: number;
  surprise: number;
  neutral: number;
}

export interface FaceResult {
  face_id: string;
  box?: { x: number; y: number; width: number; height: number };
  emotion: string;
  confidence: number;
  scores: EmotionScore;
}

export interface EmotionResult {
  id: string;
  user_id: string;
  source_type: 'image' | 'frame' | 'realtime';
  faces: FaceResult[];
  dominant_emotion: string;
  confidence: number;
  processing_time_ms?: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}
