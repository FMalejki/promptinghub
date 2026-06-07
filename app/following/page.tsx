"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Navbar } from "../components/Navbar";

type Summary = {
  creators: string[];
  tags: string[];
  collections: { id: string; name: string }[];
};

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">{title}</h2>
      {empty ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Nothing yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">{children}</div>
      )}
    </section>
  );
}

const chip =
  "inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800";

export default function FollowingPage() {
  const { status } = useSession();
  const [data, setData] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "anon">("loading");

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("anon");
      return;
    }
    fetch("/api/me/following")
      .then((r) => (r.ok ? r.json() : { creators: [], tags: [], collections: [] }))
      .then(setData)
      .catch(() => {})
      .finally(() => setState("ok"));
  }, [status]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Following</h1>

        {state === "anon" ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</Link> to manage who and what you follow.
          </div>
        ) : state === "loading" || !data ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            ))}
          </div>
        ) : (
          <>
            <Section title="Creators" empty={data.creators.length === 0}>
              {data.creators.map((h) => (
                <Link key={h} href={`/u/${h}`} className={chip}>@{h}</Link>
              ))}
            </Section>
            <Section title="Tags" empty={data.tags.length === 0}>
              {data.tags.map((t) => (
                <Link key={t} href={`/t/${encodeURIComponent(t)}`} className={chip}>#{t}</Link>
              ))}
            </Section>
            <Section title="Collections" empty={data.collections.length === 0}>
              {data.collections.map((c) => (
                <Link key={c.id} href={`/collections/${c.id}`} className={chip}>{c.name}</Link>
              ))}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}
