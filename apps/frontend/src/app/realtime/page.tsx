"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { emotionService } from "@/services/emotion.service";
import { EmotionWebSocketService } from "@/services/websocket.service";
import type { EmotionResult, EmotionScore } from "@/types/emotion.types";

type WsStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

const EMOTION_EMOJI: Record<string, string> = {
  angry: "😠",
  disgust: "🤢",
  fear: "😨",
  happy: "😄",
  sad: "😢",
  surprise: "😲",
  neutral: "😐",
};

const EMOTION_COLOR: Record<string, string> = {
  angry: "bg-red-500",
  disgust: "bg-green-700",
  fear: "bg-purple-500",
  happy: "bg-yellow-400",
  sad: "bg-blue-500",
  surprise: "bg-orange-400",
  neutral: "bg-gray-400",
};

const STATUS_BADGE: Record<WsStatus, { label: string; cls: string }> = {
  idle: { label: "Idle", cls: "bg-gray-100 text-gray-600" },
  connecting: { label: "Connecting…", cls: "bg-yellow-100 text-yellow-700" },
  connected: { label: "Connected", cls: "bg-green-100 text-green-700" },
  disconnected: { label: "Disconnected", cls: "bg-gray-100 text-gray-500" },
  error: { label: "Error", cls: "bg-red-100 text-red-600" },
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface EmotionDisplay {
  dominant_emotion: string;
  confidence: number;
  scores: EmotionScore;
}

export default function RealtimePage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<EmotionWebSocketService | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>("idle");
  const [result, setResult] = useState<EmotionDisplay | null>(null);
  const [uploadResult, setUploadResult] = useState<EmotionDisplay | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraAndWs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCameraAndWs() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  const handleWsMessage = useCallback((data: unknown) => {
    if (typeof data !== "object" || data === null) return;
    const msg = data as Record<string, unknown>;

    if (msg.event === "emotion.result" && msg.data) {
      const d = msg.data as Partial<EmotionResult>;
      if (d.dominant_emotion && d.confidence != null) {
        const scores: EmotionScore = d.faces?.[0]?.scores ?? {
          angry: 0,
          disgust: 0,
          fear: 0,
          happy: 0,
          sad: 0,
          surprise: 0,
          neutral: 0,
        };
        setResult({
          dominant_emotion: d.dominant_emotion,
          confidence: d.confidence,
          scores,
        });
      }
    }

    if (msg.event === "emotion.error") {
      setWsStatus("error");
    }
  }, []);

  const handleStatusChange = useCallback((connected: boolean) => {
    setWsStatus(connected ? "connected" : "disconnected");
  }, []);

  async function startCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Connect WebSocket
      setWsStatus("connecting");
      const ws = new EmotionWebSocketService();
      wsRef.current = ws;
      ws.connect(handleWsMessage, handleStatusChange);

      // Start frame capture interval
      intervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !ws.isConnected) return;

        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
        if (base64) ws.sendFrame(base64);
      }, 1000);

      setIsCameraOn(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not access camera.";
      setCameraError(msg);
    }
  }

  function stopCamera() {
    stopCameraAndWs();
    setIsCameraOn(false);
    setWsStatus("idle");
    setResult(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploadResult(null);
    setIsUploading(true);

    try {
      const res = await emotionService.predict(file, "upload");
      const scores: EmotionScore = res.faces?.[0]?.scores ?? {
        angry: 0,
        disgust: 0,
        fear: 0,
        happy: 0,
        sad: 0,
        surprise: 0,
        neutral: 0,
      };
      setUploadResult({
        dominant_emotion: res.dominant_emotion,
        confidence: res.confidence,
        scores,
      });
    } catch {
      setUploadError("Failed to analyse image. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset input so same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (!isAuthenticated) return null;

  const displayResult = result ?? uploadResult;
  const badge = STATUS_BADGE[wsStatus];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-900">
          Emotion Classification
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/history"
            className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
          >
            History
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Real-time emotion detection
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera section */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">Camera</h2>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.cls}`}
              >
                {badge.label}
              </span>
            </div>

            {/* Video */}
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Camera is off</p>
                </div>
              )}
            </div>

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            {cameraError && (
              <p className="text-sm text-red-600">{cameraError}</p>
            )}

            {/* Camera controls */}
            <div className="flex gap-3">
              {!isCameraOn ? (
                <button
                  onClick={startCamera}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Start camera
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Stop camera
                </button>
              )}
            </div>

            {/* Image upload */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                Or upload an image
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  {isUploading ? "Analysing…" : "Choose image"}
                </span>
                {uploadError && (
                  <span className="text-xs text-red-600">{uploadError}</span>
                )}
              </label>
            </div>
          </div>

          {/* Results section */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-800">Results</h2>

            {!displayResult && (
              <div className="flex-1 flex items-center justify-center py-16">
                <p className="text-gray-400 text-sm">
                  Start the camera or upload an image to see results.
                </p>
              </div>
            )}

            {displayResult && (
              <>
                {/* Dominant emotion */}
                <div className="text-center py-4">
                  <span className="text-7xl block mb-2">
                    {EMOTION_EMOJI[displayResult.dominant_emotion] ?? "🔍"}
                  </span>
                  <p className="text-2xl font-bold text-gray-900">
                    {capitalize(displayResult.dominant_emotion)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(displayResult.confidence * 100).toFixed(1)}% confidence
                  </p>
                </div>

                {/* Bar chart */}
                <div className="space-y-2">
                  {(
                    Object.entries(displayResult.scores) as [
                      string,
                      number
                    ][]
                  )
                    .sort(([, a], [, b]) => b - a)
                    .map(([emotion, score]) => (
                      <div key={emotion} className="flex items-center gap-2">
                        <span className="w-16 text-xs text-gray-600 shrink-0">
                          {EMOTION_EMOJI[emotion]} {capitalize(emotion)}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-3 rounded-full transition-all duration-300 ${EMOTION_COLOR[emotion] ?? "bg-blue-400"}`}
                            style={{
                              width: `${Math.max(0, Math.min(100, score * 100)).toFixed(1)}%`,
                            }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-gray-500 shrink-0">
                          {(score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
