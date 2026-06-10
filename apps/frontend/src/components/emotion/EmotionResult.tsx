import React from "react";
import { cn, formatConfidence, EMOTION_COLORS, EMOTION_EMOJI } from "@/lib/utils";
import type { EmotionResult as EmotionResultType, EmotionScore } from "@/types/emotion.types";
import { Card } from "@/components/ui/Card";

interface EmotionResultProps {
  result: EmotionResultType;
}

/** Tailwind bar-color classes keyed by emotion (bg only, no text) */
const BAR_COLORS: Record<string, string> = {
  angry: "bg-red-500",
  disgust: "bg-green-700",
  fear: "bg-purple-600",
  happy: "bg-yellow-400",
  sad: "bg-blue-500",
  surprise: "bg-orange-400",
  neutral: "bg-gray-400",
};

const EMOTION_LABELS: Record<string, string> = {
  angry: "Angry",
  disgust: "Disgust",
  fear: "Fear",
  happy: "Happy",
  sad: "Sad",
  surprise: "Surprise",
  neutral: "Neutral",
};

const scoreEntries = (scores: EmotionScore): [string, number][] =>
  Object.entries(scores).sort(([, a], [, b]) => b - a);

export const EmotionResult: React.FC<EmotionResultProps> = ({ result }) => {
  const { dominant_emotion, confidence, faces } = result;
  const faceCount = faces.length;

  const dominantEmoji = EMOTION_EMOJI[dominant_emotion] ?? "❓";
  const dominantLabel = EMOTION_LABELS[dominant_emotion] ?? dominant_emotion;
  const dominantBadgeClass = EMOTION_COLORS[dominant_emotion] ?? "bg-gray-200 text-gray-800";

  // Use scores from the first face for the bar chart; aggregate if multiple faces
  const aggregatedScores: EmotionScore = React.useMemo(() => {
    if (faces.length === 0) {
      return {
        angry: 0,
        disgust: 0,
        fear: 0,
        happy: 0,
        sad: 0,
        surprise: 0,
        neutral: 0,
      };
    }
    if (faces.length === 1) return faces[0].scores;

    // Average scores across all faces
    const keys = Object.keys(faces[0].scores) as (keyof EmotionScore)[];
    const totals = keys.reduce(
      (acc, key) => {
        acc[key] = faces.reduce((sum, f) => sum + f.scores[key], 0) / faces.length;
        return acc;
      },
      {} as EmotionScore
    );
    return totals;
  }, [faces]);

  return (
    <Card className="flex flex-col gap-5">
      {/* Header: dominant emotion */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center justify-center h-16 w-16 rounded-full bg-gray-50 border border-gray-200 flex-shrink-0">
          <span className="text-3xl leading-none" role="img" aria-label={dominantLabel}>
            {dominantEmoji}
          </span>
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold capitalize",
                dominantBadgeClass
              )}
            >
              {dominantLabel}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatConfidence(confidence)}
          </p>
          <p className="text-sm text-gray-500">
            {faceCount === 1 ? "1 face detected" : `${faceCount} faces detected`}
          </p>
        </div>
      </div>

      {/* Emotion score bar chart */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Emotion Scores
        </h3>
        <div className="flex flex-col gap-1.5">
          {scoreEntries(aggregatedScores).map(([emotion, score]) => {
            const pct = Math.round(score * 100);
            const label = EMOTION_LABELS[emotion] ?? emotion;
            const barColor = BAR_COLORS[emotion] ?? "bg-gray-300";
            return (
              <div key={emotion} className="flex items-center gap-2">
                <span className="w-16 text-xs text-gray-600 capitalize flex-shrink-0">
                  {label}
                </span>
                <div
                  className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${label} score`}
                >
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-gray-500 flex-shrink-0 tabular-nums">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Face list (if multiple) */}
      {faceCount > 1 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Per-face Results
          </h3>
          <div className="flex flex-col gap-1">
            {faces.map((face) => {
              const emoji = EMOTION_EMOJI[face.emotion] ?? "❓";
              const faceLabel = EMOTION_LABELS[face.emotion] ?? face.emotion;
              const badgeClass = EMOTION_COLORS[face.emotion] ?? "bg-gray-200 text-gray-800";
              return (
                <div
                  key={face.face_id}
                  className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-md"
                >
                  <span className="text-gray-600">Face {face.face_id + 1}</span>
                  <div className="flex items-center gap-2">
                    <span role="img" aria-label={faceLabel}>
                      {emoji}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                        badgeClass
                      )}
                    >
                      {faceLabel}
                    </span>
                    <span className="text-gray-500 tabular-nums">
                      {formatConfidence(face.confidence)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default EmotionResult;
