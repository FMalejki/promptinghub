"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { promptImageSrc, getPlaceholderImage } from "@/lib/constants";

type DayPrompt = {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string | null;
  author: { name: string };
};

// A single rotating "prompt of the day" banner, deterministic per UTC day.
export function PromptOfDay() {
  const [prompt, setPrompt] = useState<DayPrompt | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/prompt-of-day")
      .then((r) => (r.ok ? r.json() : { prompt: null }))
      .then((d) => {
        if (!active) return;
        setPrompt(d.prompt);
        if (d.prompt) setImgSrc(promptImageSrc(d.prompt.image, d.prompt.id, d.prompt.category));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!prompt) return null;

  return (
    <Link
      href={`/prompt/${prompt.id}`}
      className="group block mb-10 overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 hover:shadow-lg transition-shadow"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-56 h-40 sm:h-auto shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
          {imgSrc && (
            <img
              src={imgSrc}
              alt={prompt.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={() => setImgSrc(getPlaceholderImage(prompt.id, prompt.category))}
            />
          )}
        </div>
        <div className="flex-1 p-6">
          <div className="inline-flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Prompt of the day
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
            {prompt.name}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{prompt.description}</p>
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="px-2 py-0.5 rounded-md bg-white/70 dark:bg-gray-800/70">{prompt.category}</span>
            <span>by {prompt.author.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
