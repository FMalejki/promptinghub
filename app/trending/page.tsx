"use client";
import { useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import { PromptCard } from "../components/PromptCard";

type Prompt = React.ComponentProps<typeof PromptCard>;

export default function TrendingPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/prompts?sort=trending")
      .then((r) => (r.ok ? r.json() : { prompts: [] }))
      .then((d) => setPrompts(d.prompts || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">🔥 Trending</h1>
          <p className="text-gray-600 dark:text-gray-400">The most copied & starred prompts right now</p>
        </div>

        {!loaded ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : prompts.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">Nothing trending yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((p, i) => (
              <div key={p.id} className="relative">
                {i < 3 && (
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
