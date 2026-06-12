"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { Avatar } from "../Avatar";
import type { TopCreator } from "@/lib/users";

// Client list with "Load more" — the server renders the first page for SEO/initial
// paint, then this appends ranked pages from /api/creators without a full reload.
export function CreatorsList({
  initial,
  initialNextOffset,
  pageSize,
}: {
  initial: TopCreator[];
  initialNextOffset: number | null;
  pageSize: number;
}) {
  const [creators, setCreators] = useState<TopCreator[]>(initial);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (nextOffset == null || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/creators?offset=${nextOffset}&limit=${pageSize}`);
      const data = res.ok ? await res.json() : { creators: [], nextOffset: null };
      // De-dupe defensively in case ranking shifts between requests.
      setCreators((prev) => {
        const seen = new Set(prev.map((c) => c.handle));
        return [...prev, ...(data.creators as TopCreator[]).filter((c) => !seen.has(c.handle))];
      });
      setNextOffset(data.nextOffset ?? null);
    } catch {
      setNextOffset(null);
    } finally {
      setLoading(false);
    }
  }, [nextOffset, loading, pageSize]);

  return (
    <>
      <ol className="space-y-2">
        {creators.map((c, i) => (
          <li key={c.handle}>
            <Link
              href={`/u/${c.handle}`}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <span className="w-6 text-center font-bold text-gray-400">{i + 1}</span>
              <Avatar name={c.name} image={c.image} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</span>
                  {c.verified && (
                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Verified">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">@{c.handle}</div>
              </div>
              <div className="hidden sm:flex items-center gap-5 text-sm text-gray-600 dark:text-gray-400">
                <span><b className="text-gray-900 dark:text-white">{c.followers}</b> followers</span>
                <span><b className="text-gray-900 dark:text-white">{c.stars}</b> stars</span>
                <span><b className="text-gray-900 dark:text-white">{c.prompts}</b> prompts</span>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      {nextOffset != null && (
        <div className="mt-6 text-center">
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
