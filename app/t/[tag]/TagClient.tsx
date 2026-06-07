"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "../../components/Navbar";
import { PromptCard } from "../../components/PromptCard";

type Prompt = React.ComponentProps<typeof PromptCard>;

function FollowTagButton({ tag }: { tag: string }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/follow/tag?tag=${encodeURIComponent(tag)}`)
      .then((r) => (r.ok ? r.json() : { following: false }))
      .then((d) => setFollowing(!!d.following))
      .catch(() => setFollowing(false));
  }, [tag]);

  async function toggle() {
    if (following === null || busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next); // optimistic
    const res = await fetch("/api/follow/tag", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    }).catch(() => null);
    if (!res || (res.status === 401 && next)) {
      setFollowing(!next); // revert (signed out / failed)
      if (res?.status === 401) window.location.href = "/login";
    }
    setBusy(false);
  }

  if (following === null) return null;
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={
        following
          ? "px-4 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          : "px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
      }
    >
      {following ? "Following" : "Follow tag"}
    </button>
  );
}

export function TagClient({ tag }: { tag: string }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/prompts?tag=${encodeURIComponent(tag)}`)
      .then((r) => (r.ok ? r.json() : { prompts: [] }))
      .then((d) => setPrompts(d.prompts || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [tag]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/tags" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">← All tags</Link>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              <span className="text-blue-600 dark:text-blue-400">#</span>
              {tag}
            </h1>
            <FollowTagButton tag={tag} />
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
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No prompts tagged <span className="font-mono">#{tag}</span> yet.
          </div>
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
