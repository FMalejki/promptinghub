"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";

type Rec = { handle: string; name: string; image: string | null; verified: boolean; followers: number };

// "You might also like" creator suggestions. `exclude` drops the current page's
// creator. Renders nothing when there are no suggestions.
export function RecommendedCreators({ exclude }: { exclude?: string }) {
  const [creators, setCreators] = useState<Rec[]>([]);

  useEffect(() => {
    let active = true;
    const q = exclude ? `?exclude=${encodeURIComponent(exclude)}` : "";
    fetch(`/api/creators/recommended${q}`)
      .then((r) => (r.ok ? r.json() : { creators: [] }))
      .then((d) => active && setCreators(d.creators || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [exclude]);

  if (creators.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">You might also like</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {creators.map((c) => (
          <Link
            key={c.handle}
            href={`/u/${c.handle}`}
            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <Avatar name={c.name} image={c.image} size={40} />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</span>
                {c.verified && (
                  <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Verified">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">@{c.handle} · {c.followers} followers</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
