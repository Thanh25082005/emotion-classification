export interface EmotionScore {
  angry: number;
  disgust: number;
  fear: number;
  happy: number;
  sad: number;
  surprise: number;
  neutral: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceResult {
  face_id: number;
  box?: BoundingBox;
  emotion: string;
  confidence: number;
  scores: EmotionScore;
}

export interface EmotionResult {
  id: string;
  user_id: string;
  source_type: string;
  faces: FaceResult[];
  dominant_emotion: string;
  confidence: number;
  processing_time_ms: number;
  created_at: string;
}

export interface EmotionHistory {
  items: EmotionResult[];
  total: number;
  page: number;
  page_size: number;
}

export interface EmotionStatistics {
  total_predictions: number;
  emotion_distribution: Record<string, number>;
  average_confidence: number;
  most_common_emotion: string;
}
