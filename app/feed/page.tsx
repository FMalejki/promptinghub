"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Navbar } from "../components/Navbar";
import { PromptCard } from "../components/PromptCard";

type Prompt = React.ComponentProps<typeof PromptCard>;

export default function FeedPage() {
  const { status } = useSession();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "anon">("loading");
  const [source, setSource] = useState<"creators" | "tags">("creators");

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("anon");
      return;
    }
    setState("loading");
    fetch(`/api/feed${source === "tags" ? "?source=tags" : ""}`)
      .then((r) => (r.ok ? r.json() : { prompts: [] }))
      .then((d) => setPrompts(d.prompts || []))
      .catch(() => {})
      .finally(() => setState("ok"));
  }, [status, source]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your feed</h1>
          {state !== "anon" && (
            <div className="flex items-center gap-3">
            <Link href="/following" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">Manage following</Link>
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden text-sm">
              {(["creators", "tags"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={
                    source === s
                      ? "px-4 py-1.5 bg-blue-600 text-white"
                      : "px-4 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }
                >
                  {s === "creators" ? "Creators" : "Tags"}
                </button>
              ))}
            </div>
            </div>
          )}
        </div>

        {state === "anon" ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</Link> to follow creators and build your feed.
          </div>
        ) : state === "loading" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : prompts.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No prompts yet — <Link href={source === "tags" ? "/tags" : "/browse"} className="text-blue-600 dark:text-blue-400 hover:underline">{source === "tags" ? "follow some tags" : "browse"}</Link>
            {source === "tags" ? " to fill this feed." : " and follow some creators."}
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
