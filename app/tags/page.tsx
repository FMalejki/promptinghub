import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { topTags, trendingTags } from "@/lib/prompts";
import { nextOffset } from "@/lib/pagination";
import { Navbar } from "../components/Navbar";
import { TagCloud } from "./TagCloud";

export const metadata: Metadata = {
  title: "Tags",
  description: "Browse prompts by tag on PromptingHub.",
};

export const revalidate = 300; // refresh every 5 min

const PAGE_SIZE = 80;

export default async function TagsPage() {
  let tags: { tag: string; count: number }[] = [];
  let trending: { tag: string; score: number }[] = [];
  try {
    const db = await getDb();
    [tags, trending] = await Promise.all([topTags(db, PAGE_SIZE, 0), trendingTags(db, { days: 7, limit: 12 })]);
  } catch {
    // DB unavailable — render the empty state.
  }
  const max = tags.length ? tags[0].count : 0;
  const initialNextOffset = nextOffset(tags.length, PAGE_SIZE, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">Tags</h1>
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

        <TagCloud initial={tags} initialNextOffset={initialNextOffset} max={max} pageSize={PAGE_SIZE} />
      </main>
    </div>
  );
}
