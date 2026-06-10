import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export const EMOTION_COLORS: Record<string, string> = {
  angry: "bg-red-500 text-white",
  disgust: "bg-green-700 text-white",
  fear: "bg-purple-600 text-white",
  happy: "bg-yellow-400 text-gray-900",
  sad: "bg-blue-500 text-white",
  surprise: "bg-orange-400 text-white",
  neutral: "bg-gray-400 text-white",
};

export const EMOTION_EMOJI: Record<string, string> = {
  angry: "😠",
  disgust: "🤢",
  fear: "😨",
  happy: "😄",
  sad: "😢",
  surprise: "😲",
  neutral: "😐",
};
