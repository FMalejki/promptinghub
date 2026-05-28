"use client";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Prompt = { id: string; name: string; description: string };

export default function BrowsePage() {
  const { status, data } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await fetch("/api/prompts" + (q ? `?q=${encodeURIComponent(q)}` : ""));
      setPrompts(res.ok ? await res.json() : []);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q, status]);

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
        <ul className="mt-4 divide-y divide-gray-200 border border-gray-200 rounded bg-white">
          {loading && <li className="px-4 py-3 text-sm text-gray-400">Loading…</li>}
          {!loading && prompts.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400">No prompts found.</li>
          )}
          {prompts.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => {/* mock download */}}
                className="w-full text-left px-4 py-3 hover:bg-gray-50"
              >
                <div className="text-sm font-medium text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
