"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { promptImageSrc, getPlaceholderImage } from "@/lib/constants";

type TrendingPrompt = {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string | null;
  stars: number;
  author: { name: string };
};

// "Trending now" — the top few prompts by trending score (engagement with
// time-decay), shown as ranked tiles. Distinct amber/fire treatment so it reads
// differently from the blue "Prompt of the day" banner above it. Renders nothing
// until data arrives (and nothing if there aren't at least 2 trending prompts —
// a one-tile "trending" row looks broken).
export function TrendingNow() {
  const [prompts, setPrompts] = useState<TrendingPrompt[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/prompts?sort=trending&limit=3")
      .then((r) => (r.ok ? r.json() : { prompts: [] }))
      .then((d) => {
        if (active) setPrompts(Array.isArray(d.prompts) ? d.prompts : []);
      })
      .catch(() => active && setPrompts([]));
    return () => {
      active = false;
    };
  }, []);

  if (!prompts || prompts.length < 2) return null;

  return (
    <section aria-label="Trending now" className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
              clipRule="evenodd"
            />
          </svg>
          Trending now
        </span>
        <Link href="/trending" className="text-xs font-medium text-amber-700/80 dark:text-amber-300/80 hover:underline">
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {prompts.slice(0, 3).map((p, i) => (
          <TrendingTile key={p.id} prompt={p} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}

function TrendingTile({ prompt, rank }: { prompt: TrendingPrompt; rank: number }) {
  const [imgSrc, setImgSrc] = useState(() => promptImageSrc(prompt.image, prompt.id, prompt.category));
  return (
    <Link
      href={`/prompt/${prompt.id}`}
      className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-3 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all"
    >
      <span
        className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold tabular-nums shadow-sm"
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </span>
      <div className="w-12 h-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {imgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={() => setImgSrc(getPlaceholderImage(prompt.id, prompt.category))}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
          {prompt.name}
        </h3>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">{prompt.category}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {prompt.stars}
          </span>
        </div>
      </div>
    </Link>
  );
}
