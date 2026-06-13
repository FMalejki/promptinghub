"use client";
import { useCallback, useState } from "react";
import Link from "next/link";

type Tag = { tag: string; count: number };

// Scale a tag's font size by how common it is, relative to the most-used tag.
function sizeClass(count: number, max: number): string {
  const r = max > 0 ? count / max : 0;
  if (r > 0.66) return "text-2xl font-bold";
  if (r > 0.33) return "text-xl font-semibold";
  if (r > 0.15) return "text-lg";
  return "text-base";
}

// Client tag cloud with "Load more". `max` is the global top count (passed from the
// server's first page, which is sorted desc) so later pages size consistently.
export function TagCloud({
  initial,
  initialNextOffset,
  max,
  pageSize,
}: {
  initial: Tag[];
  initialNextOffset: number | null;
  max: number;
  pageSize: number;
}) {
  const [tags, setTags] = useState<Tag[]>(initial);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (nextOffset == null || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tags?offset=${nextOffset}&limit=${pageSize}`);
      const data = res.ok ? await res.json() : { tags: [], nextOffset: null };
      setTags((prev) => {
        const seen = new Set(prev.map((t) => t.tag));
        return [...prev, ...(data.tags as Tag[]).filter((t) => !seen.has(t.tag))];
      });
      setNextOffset(data.nextOffset ?? null);
    } catch {
      setNextOffset(null);
    } finally {
      setLoading(false);
    }
  }, [nextOffset, loading, pageSize]);

  if (tags.length === 0) {
    return <div className="text-center py-16 text-gray-500 dark:text-gray-400">No tags yet.</div>;
  }

  return (
    <>
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

      {nextOffset != null && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-60 transition-colors"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
