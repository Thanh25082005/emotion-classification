"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { emotionService } from "@/services/emotion.service";
import type { EmotionResult } from "@/types/emotion.types";

const PAGE_SIZE = 20;

const EMOTION_EMOJI: Record<string, string> = {
  angry: "😠",
  disgust: "🤢",
  fear: "😨",
  happy: "😄",
  sad: "😢",
  surprise: "😲",
  neutral: "😐",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();

  const [items, setItems] = useState<EmotionResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  const fetchPage = useCallback(
    async (p: number) => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      setError("");
      try {
        const data = await emotionService.getHistory(p, PAGE_SIZE);
        setItems(data.items);
        setTotal(data.total);
      } catch {
        setError("Failed to load history. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await emotionService.deleteResult(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      setError("Failed to delete result.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!isAuthenticated) return null;

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
            href="/realtime"
            className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
          >
            Real-time
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
          Prediction history
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <TableHeader />
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && items.length === 0 && !error && (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
            <p className="text-gray-400 text-sm">No prediction history yet.</p>
            <Link
              href="/realtime"
              className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Start classifying
            </Link>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <TableHeader />
                <tbody className="divide-y divide-gray-100">
                  {items.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <span className="text-xl">
                            {EMOTION_EMOJI[r.dominant_emotion] ?? "🔍"}
                          </span>
                          <span className="font-medium text-gray-800">
                            {capitalize(r.dominant_emotion)}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                        {(r.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                        {r.source_type}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="text-red-500 hover:text-red-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {deletingId === r.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} &mdash; {total} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function TableHeader() {
  return (
    <thead className="bg-gray-50">
      <tr>
        {["Emotion", "Confidence", "Source", "Timestamp", ""].map((h, i) => (
          <th
            key={i}
            className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}
