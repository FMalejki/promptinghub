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
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{category}</h1>
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
