"use client";
import { useCallback, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Avatar } from "../Avatar";

type Author = { email: string; name: string; image: string | null };
type Prompt = { id: string; name: string; description: string; category: string; author: Author };

export default function BrowsePage() {
  const { status, data } = useSession();
  const authed = status === "authenticated";
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const res = await fetch("/api/prompts" + (params.toString() ? `?${params}` : ""));
    const body = res.ok ? await res.json() : { prompts: [], categories: [] };
    setPrompts(body.prompts);
    setCategories(body.categories);
    setLoaded(true);
  }, [q, category]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-sm font-medium text-gray-800">PromptingHub</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {authed ? (
              <>
                <Link href="/profile" className="flex items-center gap-2 hover:text-gray-800">
                  <Avatar name={data!.user?.name || ""} image={data!.user?.image} size={24} />
                  <span>{data!.user?.name || data!.user?.email}</span>
                </Link>
                <button onClick={() => signOut({ callbackUrl: "/browse" })} className="hover:text-gray-800">Sign out</button>
              </>
            ) : (
              <Link href="/login" className="text-gray-800 hover:underline">Sign in</Link>
            )}
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search prompts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-500"
          />
          {authed && (
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="bg-gray-800 hover:bg-gray-900 text-white text-sm rounded px-3 shrink-0"
            >
              {showAdd ? "Close" : "Add prompt"}
            </button>
          )}
        </div>

        {authed && showAdd && <AddPromptForm categories={categories} onAdded={() => { setShowAdd(false); load(); }} />}

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip active={category === null} onClick={() => setCategory(null)}>All</Chip>
            {categories.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>{c}</Chip>
            ))}
          </div>
        )}

        <ul className="mt-4 divide-y divide-gray-200 border border-gray-200 rounded bg-white">
          {loaded && prompts.length === 0 && <li className="px-4 py-3 text-sm text-gray-400">No prompts found.</li>}
          {prompts.map((p) => (
            <li key={p.id}>
              <button onClick={() => {/* mock download */}} className="w-full text-left px-4 py-3 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium text-gray-900">{p.name}</div>
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 shrink-0 mt-0.5">{p.category}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                  <Avatar name={p.author.name} image={p.author.image} size={18} />
                  <span>{p.author.name}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border ${active ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}
    >
      {children}
    </button>
  );
}

function AddPromptForm({ categories, onAdded }: { categories: string[]; onAdded: () => void }) {
  const [form, setForm] = useState({ name: "", description: "", category: "", body: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) onAdded();
    else setError("Could not save — fill every field.");
  }

  const input = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500";
  return (
    <form onSubmit={submit} className="mt-3 border border-gray-200 rounded bg-white p-4 space-y-2">
      <input className={input} placeholder="Name" value={form.name} onChange={set("name")} required />
      <input className={input} placeholder="Short description" value={form.description} onChange={set("description")} required />
      <input className={input} placeholder="Category" list="cats" value={form.category} onChange={set("category")} required />
      <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <textarea className={input} placeholder="Prompt body" rows={4} value={form.body} onChange={set("body")} required />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button disabled={saving} className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm rounded py-2 px-4">
        {saving ? "Saving…" : "Save prompt"}
      </button>
    </form>
  );
}
