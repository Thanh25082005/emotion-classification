"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { emotionService } from "@/services/emotion.service";
import type { EmotionStatistics, EmotionResult } from "@/types/emotion.types";

const EMOTION_EMOJI: Record<string, string> = {
  angry: "😠",
  disgust: "🤢",
  fear: "😨",
  happy: "😄",
  sad: "😢",
  surprise: "😲",
  neutral: "😐",
};

function NavBar({ onLogout }: { onLogout: () => void }) {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <span className="text-lg font-semibold text-gray-900">
        Emotion Classification
      </span>
      <div className="flex items-center gap-4">
        <Link
          href="/realtime"
          className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
        >
          Real-time
        </Link>
        <Link
          href="/history"
          className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
        >
          History
        </Link>
        <button
          onClick={onLogout}
          className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();

  const [stats, setStats] = useState<EmotionStatistics | null>(null);
  const [recent, setRecent] = useState<EmotionResult[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [recentError, setRecentError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    emotionService
      .getStatistics()
      .then(setStats)
      .catch(() => setStatsError("Failed to load statistics"))
      .finally(() => setStatsLoading(false));

    emotionService
      .getHistory(1, 5)
      .then((h) => setRecent(h.items))
      .catch(() => setRecentError("Failed to load recent results"))
      .finally(() => setRecentLoading(false));
  }, [isAuthenticated]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar onLogout={handleLogout} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.full_name ?? user?.email ?? "User"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
        </div>

        {/* Stats grid */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Your statistics
          </h2>
          {statsError && (
            <p className="text-sm text-red-600">{statsError}</p>
          )}
          {!statsError && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Total predictions"
                value={
                  statsLoading
                    ? "—"
                    : String(stats?.total_predictions ?? 0)
                }
              />
              <StatCard
                label="Most common emotion"
                value={
                  statsLoading
                    ? "—"
                    : stats?.most_common_emotion
                    ? `${EMOTION_EMOJI[stats.most_common_emotion] ?? ""} ${capitalize(stats.most_common_emotion)}`
                    : "N/A"
                }
              />
              <StatCard
                label="Avg. confidence"
                value={
                  statsLoading
                    ? "—"
                    : stats?.average_confidence != null
                    ? `${(stats.average_confidence * 100).toFixed(1)}%`
                    : "N/A"
                }
              />
            </div>
          )}
        </section>

        {/* Recent results */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent results
            </h2>
            <Link
              href="/history"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              View all
            </Link>
          </div>

          {recentError && (
            <p className="text-sm text-red-600">{recentError}</p>
          )}

          {!recentError && recentLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {!recentError && !recentLoading && recent.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center">
              <p className="text-gray-400 text-sm">No results yet.</p>
              <Link
                href="/realtime"
                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Start classifying
              </Link>
            </div>
          )}

          {!recentError && !recentLoading && recent.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {recent.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {EMOTION_EMOJI[r.dominant_emotion] ?? "🔍"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {capitalize(r.dominant_emotion)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {r.source_type} &middot;{" "}
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {(r.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
