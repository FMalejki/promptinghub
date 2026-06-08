"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "../../components/Navbar";
import { PromptCard } from "../../components/PromptCard";

type Prompt = React.ComponentProps<typeof PromptCard>;

export function CategoryClient({ category }: { category: string }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/prompts?category=${encodeURIComponent(category)}`)
      .then((r) => (r.ok ? r.json() : { prompts: [] }))
      .then((d) => setPrompts(d.prompts || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [category]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/categories" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">← All categories</Link>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{category}</h1>
            <a
              href={`/c/${encodeURIComponent(category)}/feed.xml`}
              target="_blank"
              rel="noreferrer"
              title={`RSS feed for ${category}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 shrink-0"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.18 15.64a2.18 2.18 0 012.18 2.18C8.36 19 7.38 20 6.18 20 5 20 4 19 4 17.82a2.18 2.18 0 012.18-2.18zM4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27zm0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93z" />
              </svg>
              RSS
            </a>
          </div>
          {loaded && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"}
            </p>
          )}
        </div>

        {!loaded ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : prompts.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No prompts in {category} yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((p) => (
              <PromptCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
