"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "../components/Navbar";
import { PromptCard } from "../components/PromptCard";
import { PromptOfDay } from "../components/PromptOfDay";
import { PROMPT_CATEGORIES } from "@/lib/constants";
import { hasActiveFilters } from "@/lib/browseFilters";
import Link from "next/link";

type Author = { email: string; name: string; image: string | null };
type Prompt = {
  id: string;
  name: string;
  description: string;
  category: string;
  author: Author;
  image: string | null;
  stars: number;
  isPrivate: boolean;
};

export default function BrowsePage() {
  const { status, data } = useSession();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<"recent" | "popular" | "copied" | "viewed">("recent");
  const [imageOnly, setImageOnly] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<{ prompts: number; creators: number; copies: number } | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {});
  }, []);

  // Seed filters from the URL so /browse?tag=seo and /browse?q=email (and the
  // OpenSearch engine) deep-link into a filtered view.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tag");
    if (t) setTag(t);
    const query = params.get("q");
    if (query) setQ(query);
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (imageOnly) params.set("image", "1");
    if (tag) params.set("tag", tag);
    params.set("sort", sort);

    setError(false);
    try {
      const res = await fetch("/api/prompts" + (params.toString() ? `?${params}` : ""));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setPrompts(body.prompts || []);
    } catch {
      setError(true);
      setPrompts([]);
    } finally {
      setLoaded(true);
    }
  }, [q, category, sort, imageOnly, tag]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Discover AI Prompts
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Browse, share, and discover the best prompts for your AI workflows
          </p>
          {stats && stats.prompts > 0 && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.prompts.toLocaleString()}</span> prompts ·{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.creators.toLocaleString()}</span> creators ·{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.copies.toLocaleString()}</span> copies
            </p>
          )}
          <div className="mt-5">
            <a
              href="/random"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              🎲 Surprise me
            </a>
          </div>
          {tag && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setTag(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                #{tag}
                <span className="text-blue-400" aria-label="Clear tag filter">✕</span>
              </button>
            </div>
          )}
        </div>

        {/* Prompt of the day — only on the default, unfiltered view */}
        {!q && !category && !tag && !imageOnly && <PromptOfDay />}

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-3xl mx-auto">
            <input
              type="search"
              placeholder="Search prompts..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full px-6 py-4 pl-12 text-base border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-sm"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Sort */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-center">
            <button
              onClick={() => setSort("recent")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sort === "recent"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSort("popular")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sort === "popular"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => setSort("copied")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sort === "copied"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Most copied
            </button>
            <button
              onClick={() => setSort("viewed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sort === "viewed"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Most viewed
            </button>
            <button
              onClick={() => setImageOnly((v) => !v)}
              title="Show only image-generation prompts"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                imageOnly
                  ? "bg-purple-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Images
            </button>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === null
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              All
            </button>
            {PROMPT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(category === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {loaded && !error && (
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"} found
            </p>
          </div>
        )}

        {/* Error state with retry */}
        {loaded && error ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Couldn&apos;t load prompts</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Something went wrong. Check your connection and try again.</p>
            <button
              onClick={load}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        ) : loaded && prompts.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No prompts found</h3>
            {hasActiveFilters({ q, category, tag, imageOnly }) ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Nothing matched your search or filters.</p>
                <button
                  onClick={() => {
                    setQ("");
                    setCategory(null);
                    setTag(null);
                    setImageOnly(false);
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Be the first to share one with the community.</p>
                <Link
                  href="/new"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create a prompt
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt) => (
              <PromptCard key={prompt.id} {...prompt} />
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {!loaded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Made with Bob
