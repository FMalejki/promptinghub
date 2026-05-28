"use client";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Prompt = { id: string; name: string; description: string; category: string };

export default function BrowsePage() {
  const { status, data } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      const res = await fetch("/api/prompts" + (params.toString() ? `?${params}` : ""));
      const body = res.ok ? await res.json() : { prompts: [], categories: [] };
      setPrompts(body.prompts);
      setCategories(body.categories);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q, category, status]);

  if (status !== "authenticated") return null;

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-sm font-medium text-gray-800">PromptingHub</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{data?.user?.email}</span>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="hover:text-gray-800">Sign out</button>
          </div>
        </div>
      </header>
      <section className="max-w-3xl mx-auto px-4 py-8">
        <input
          type="search"
          placeholder="Search prompts…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-500"
        />
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setCategory(null)}
              className={`text-xs px-2.5 py-1 rounded-full border ${category === null ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? null : c)}
                className={`text-xs px-2.5 py-1 rounded-full border ${category === c ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <ul className="mt-4 divide-y divide-gray-200 border border-gray-200 rounded bg-white">
          {loading && <li className="px-4 py-3 text-sm text-gray-400">Loading…</li>}
          {!loading && prompts.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400">No prompts found.</li>
          )}
          {prompts.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => {/* mock download */}}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 shrink-0 mt-0.5">{p.category}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
