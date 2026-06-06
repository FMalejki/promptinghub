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
              <Link href={`/prompt/${p.id}`} className="block text-left px-4 py-3 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium text-gray-900">{p.name}</div>
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 shrink-0 mt-0.5">{p.category}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                  <Avatar name={p.author.name} image={p.author.image} size={18} />
                  <span>{p.author.name}</span>
                </div>
              </Link>
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

type DraftFile = { path: string; content: string };

function AddPromptForm({ categories, onAdded }: { categories: string[]; onAdded: () => void }) {
  const [meta, setMeta] = useState({ name: "", description: "", category: "" });
  const [files, setFiles] = useState<DraftFile[]>([{ path: "prompt.txt", content: "" }]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const setM = (k: keyof typeof meta) => (e: React.ChangeEvent<HTMLInputElement>) => setMeta({ ...meta, [k]: e.target.value });

  function addFiles(incoming: DraftFile[]) {
    if (!incoming.length) return;
    setFiles((cur) => {
      const blankOnly = cur.length === 1 && !cur[0].content.trim() && cur[0].path === "prompt.txt";
      return (blankOnly ? [] : cur).concat(incoming);
    });
  }

  async function readFileList(list: FileList) {
    const read = await Promise.all(
      Array.from(list).map(async (f) => ({ path: f.name, content: await f.text() }))
    );
    addFiles(read);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) await readFileList(e.dataTransfer.files);
  }

  function updateFile(i: number, patch: Partial<DraftFile>) {
    setFiles((cur) => cur.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function removeFile(i: number) {
    setFiles((cur) => (cur.length > 1 ? cur.filter((_, idx) => idx !== i) : cur));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payloadFiles = files.filter((f) => f.content.trim().length).map((f) => ({ path: f.path.trim() || "prompt.txt", content: f.content }));
    if (!payloadFiles.length) return setError("Add at least one file with content.");
    setSaving(true);
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...meta, files: payloadFiles }),
    });
    setSaving(false);
    if (res.ok) onAdded();
    else setError("Could not save — fill name, description and category.");
  }

  const input = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500";
  return (
    <form onSubmit={submit} className="mt-3 border border-gray-200 rounded bg-white p-4 space-y-2">
      <input className={input} placeholder="Name" value={meta.name} onChange={setM("name")} required />
      <input className={input} placeholder="Short description" value={meta.description} onChange={setM("description")} required />
      <input className={input} placeholder="Category" list="cats" value={meta.category} onChange={setM("category")} required />
      <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded border border-dashed px-3 py-4 text-center text-xs ${dragging ? "border-gray-800 bg-gray-50 text-gray-700" : "border-gray-300 text-gray-500"}`}
      >
        Drag &amp; drop files (.txt .md .py .ts .yaml …), or{" "}
        <label className="text-gray-800 underline cursor-pointer">
          select files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) readFileList(e.target.files); e.target.value = ""; }}
          />
        </label>
      </div>

      <div className="space-y-2">
        {files.map((f, i) => (
          <div key={i} className="border border-gray-200 rounded">
            <div className="flex items-center gap-2 border-b border-gray-200 px-2 py-1.5">
              <input
                className="flex-1 text-xs font-mono px-1 py-0.5 focus:outline-none"
                value={f.path}
                placeholder="file path e.g. prompt.md"
                onChange={(e) => updateFile(i, { path: e.target.value })}
              />
              {files.length > 1 && (
                <button type="button" onClick={() => removeFile(i)} className="text-xs text-gray-400 hover:text-red-600 shrink-0">remove</button>
              )}
            </div>
            <textarea
              className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
              rows={4}
              placeholder="File content…"
              value={f.content}
              onChange={(e) => updateFile(i, { content: e.target.value })}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={() => addFiles([{ path: `file-${files.length + 1}.txt`, content: "" }])} className="text-xs text-gray-600 hover:text-gray-900">
        + Add file
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div>
        <button disabled={saving} className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm rounded py-2 px-4">
          {saving ? "Saving…" : "Save prompt"}
        </button>
      </div>
    </form>
  );
}
