import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-4",
};

export const Loading: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  className,
}) => {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "rounded-full border-gray-200 border-t-blue-600 animate-spin",
        sizeClasses[size],
        className
      )}
    />
  );
};

export const LoadingPage: React.FC = () => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
      role="status"
      aria-label="Loading page"
    >
      <div className="flex flex-col items-center gap-3">
        <Loading size="lg" />
        <p className="text-sm text-gray-500 font-medium">Loading...</p>
      </div>
    </div>
  );
};

export default Loading;
