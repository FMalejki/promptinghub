"use client";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/Navbar";
import { PromptCard } from "../components/PromptCard";
import { rankTrending, type TrendWindow } from "@/lib/trending";

type TrendingPrompt = React.ComponentProps<typeof PromptCard> & { createdAt: string | number };

const WINDOWS: { key: TrendWindow; label: string }[] = [
  { key: "24h", label: "Today" },
  { key: "7d", label: "This week" },
  { key: "all", label: "All time" },
];

export default function TrendingPage() {
  const [prompts, setPrompts] = useState<TrendingPrompt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [window, setWindow] = useState<TrendWindow>("all");

  useEffect(() => {
    fetch("/api/prompts?limit=60")
      .then((r) => (r.ok ? r.json() : { prompts: [] }))
      .then((d) => setPrompts(d.prompts || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const { ranked, mode } = useMemo(() => {
    const res = rankTrending(prompts, { now: Date.now(), window });
    return { ranked: res.prompts, mode: res.mode };
  }, [prompts, window]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">🔥 Trending</h1>
          <p className="text-gray-600 dark:text-gray-400">The most copied &amp; starred prompts</p>
          <a
            href="/feed.xml"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-orange-600 dark:text-orange-400 hover:underline"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.18 15.64a2.18 2.18 0 110 4.36 2.18 2.18 0 010-4.36zM4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44zm0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z" />
            </svg>
            RSS feed
          </a>
        </div>

        {/* Time-window toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                onClick={() => setWindow(w.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  window === w.key
                    ? "bg-orange-500 text-white"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "recent" && loaded && ranked.length > 0 && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            Not enough activity {window === "all" ? "yet" : "in this window"} to rank — showing recently added.
          </p>
        )}

        {!loaded ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : ranked.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            Nothing here for this window — try “All time”.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ranked.map((p, i) => (
              <div key={p.id} className="relative">
                {mode === "trending" && i < 3 && (
                  <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-bold flex items-center justify-center shadow-lg">
                    {i + 1}
                  </div>
                )}
                <PromptCard {...p} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
