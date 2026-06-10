import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface CameraCaptureHandle {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

interface CameraCaptureProps {
  /** Called when user clicks the capture button, providing the captured image as a File */
  onCapture?: (file: File) => void;
  /** Called on each extracted frame (as a base64 data URL) when active */
  onFrameCapture?: (base64: string) => void;
  /** When true the camera stream is active and frames are being extracted */
  active?: boolean;
  className?: string;
}

const FRAME_INTERVAL_MS = 500; // emit a frame every 500 ms while active

export const CameraCapture = forwardRef<CameraCaptureHandle, CameraCaptureProps>(
  ({ onCapture, onFrameCapture, active = false, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Frame extraction ---
    const extractFrame = useCallback((): string | null => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return null;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.8);
    }, []);

    const startFrameLoop = useCallback(() => {
      if (frameTimerRef.current) return;
      frameTimerRef.current = setInterval(() => {
        const frame = extractFrame();
        if (frame && onFrameCapture) {
          onFrameCapture(frame);
        }
      }, FRAME_INTERVAL_MS);
    }, [extractFrame, onFrameCapture]);

    const stopFrameLoop = useCallback(() => {
      if (frameTimerRef.current) {
        clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
    }, []);

    // --- Camera control ---
    const startCamera = useCallback(async () => {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setIsStreaming(true);
      } catch (err) {
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access."
            : "Could not start camera. Please check your device.";
        setError(message);
        setIsStreaming(false);
      }
    }, []);

    const stopCamera = useCallback(() => {
      stopFrameLoop();
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
      }
      setIsStreaming(false);
    }, [stopFrameLoop]);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({ startCamera, stopCamera }), [startCamera, stopCamera]);

    // React to `active` prop changes
    useEffect(() => {
      if (active && !isStreaming) {
        startCamera();
      } else if (!active && isStreaming) {
        stopCamera();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    // Manage frame loop based on streaming state
    useEffect(() => {
      if (isStreaming && onFrameCapture) {
        startFrameLoop();
      } else {
        stopFrameLoop();
      }
      return stopFrameLoop;
    }, [isStreaming, onFrameCapture, startFrameLoop, stopFrameLoop]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        stopCamera();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Capture snapshot ---
    const handleCapture = useCallback(() => {
      const canvas = canvasRef.current;
      const frame = extractFrame();
      if (!frame || !canvas || !onCapture) return;

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const file = new File([blob], `capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onCapture(file);
        },
        "image/jpeg",
        0.9
      );
    }, [extractFrame, onCapture]);

    return (
      <div className={cn("flex flex-col items-center gap-4", className)}>
        {/* Video container */}
        <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className={cn(
              "w-full h-full object-cover",
              !isStreaming && "hidden"
            )}
            muted
            playsInline
            aria-label="Camera feed"
          />

          {/* Placeholder when camera is off */}
          {!isStreaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
              <svg
                className="h-16 w-16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                />
              </svg>
              <span className="text-sm">Camera is off</span>
            </div>
          )}

          {/* Live indicator */}
          {isStreaming && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600 text-center" role="alert">
            {error}
          </p>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!isStreaming ? (
            <button
              onClick={startCamera}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                "bg-blue-600 text-white hover:bg-blue-700",
                "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              )}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                />
              </svg>
              Start Camera
            </button>
          ) : (
            <>
              <button
                onClick={stopCamera}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                  "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                )}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10h6v4H9z"
                  />
                </svg>
                Stop Camera
              </button>

              {onCapture && (
                <button
                  onClick={handleCapture}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                    "bg-blue-600 text-white hover:bg-blue-700",
                    "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  )}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Capture
                </button>
              )}
            </>
          )}
        </div>

        {/* Hidden canvas for frame extraction */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </div>
    );
  }
);

CameraCapture.displayName = "CameraCapture";

export default CameraCapture;
