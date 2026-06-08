import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { topTags, trendingTags } from "@/lib/prompts";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "Tags · PromptingHub",
  description: "Browse prompts by tag on PromptingHub.",
};

export const revalidate = 300; // refresh every 5 min

// Scale a tag's font size by how common it is, relative to the most-used tag.
function sizeClass(count: number, max: number): string {
  const r = max > 0 ? count / max : 0;
  if (r > 0.66) return "text-2xl font-bold";
  if (r > 0.33) return "text-xl font-semibold";
  if (r > 0.15) return "text-lg";
  return "text-base";
}

export default async function TagsPage() {
  let tags: { tag: string; count: number }[] = [];
  let trending: { tag: string; score: number }[] = [];
  try {
    const db = await getDb();
    [tags, trending] = await Promise.all([topTags(db, 100), trendingTags(db, { days: 7, limit: 12 })]);
  } catch {
    // DB unavailable — render the empty state.
  }
  const max = tags.length ? tags[0].count : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Tags</h1>
          <p className="text-gray-600 dark:text-gray-400">Explore prompts by topic</p>
        </div>

        {trending.length > 0 && (
          <div className="mb-10">
            <h2 className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Trending this week
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {trending.map((t) => (
                <Link
                  key={t.tag}
                  href={`/t/${encodeURIComponent(t.tag)}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                >
                  <span className="text-orange-400">#</span>
                  {t.tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {tags.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No tags yet.</div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            {tags.map((t) => (
              <Link
                key={t.tag}
                href={`/t/${encodeURIComponent(t.tag)}`}
                className={`${sizeClass(t.count, max)} text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors`}
              >
                <span className="text-blue-400">#</span>
                {t.tag}
                <span className="ml-1 text-xs text-gray-400 align-top">{t.count}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
