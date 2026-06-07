"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "../../../components/Navbar";
import { PROMPT_CATEGORIES } from "@/lib/constants";

type DraftFile = { path: string; content: string };

export default function EditPromptPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [meta, setMeta] = useState({ name: "", description: "", category: "", image: "", isPrivate: false });
  const [files, setFiles] = useState<DraftFile[]>([{ path: "prompt.txt", content: "" }]);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/prompts/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p) => {
        setMeta({ name: p.name, description: p.description, category: p.category, image: p.image || "", isPrivate: p.isPrivate });
        setFiles((p.files?.length ? p.files : [{ path: "prompt.txt", content: p.body || "" }]).map((f: DraftFile) => ({ path: f.path, content: f.content })));
        setOwnerEmail(p.author.email);
        setLoaded(true);
      })
      .catch(() => router.push("/browse"));
  }, [params.id, router]);

  useEffect(() => {
    if (loaded && status === "authenticated" && session?.user?.email && ownerEmail && session.user.email !== ownerEmail) {
      router.push(`/prompt/${params.id}`);
    }
  }, [loaded, status, session, ownerEmail, params.id, router]);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  function updateFile(i: number, patch: Partial<DraftFile>) {
    setFiles((cur) => cur.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function removeFile(i: number) {
    setFiles((cur) => (cur.length > 1 ? cur.filter((_, idx) => idx !== i) : cur));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payloadFiles = files.filter((f) => f.content.trim().length).map((f) => ({ path: f.path.trim() || "prompt.txt", content: f.content }));
    if (!payloadFiles.length) return setError("Add at least one file with content.");
    setSaving(true);
    const res = await fetch(`/api/prompts/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...meta, image: meta.image || undefined, files: payloadFiles }),
    });
    setSaving(false);
    if (res.ok) router.push(`/prompt/${params.id}`);
    else setError("Could not save — fill name, description and category.");
  }

  async function del() {
    if (!confirm("Delete this prompt? This cannot be undone.")) return;
    const res = await fetch(`/api/prompts/${params.id}`, { method: "DELETE" });
    if (res.ok) router.push("/browse");
  }

  const input = "w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const label = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Prompt</h1>
        <form onSubmit={save} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <label className={label}>Name *</label>
              <input className={input} value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} required maxLength={100} />
            </div>
            <div>
              <label className={label}>Description *</label>
              <input className={input} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} required maxLength={300} />
            </div>
            <div>
              <label className={label}>Category *</label>
              <select className={input} value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })} required>
                <option value="">Select a category</option>
                {PROMPT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Cover Image URL (optional)</label>
              <input className={input} value={meta.image} onChange={(e) => setMeta({ ...meta, image: e.target.value })} placeholder="https://…" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="priv" checked={meta.isPrivate} onChange={(e) => setMeta({ ...meta, isPrivate: e.target.checked })} className="w-4 h-4" />
              <label htmlFor="priv" className="text-sm text-gray-700 dark:text-gray-300">Private (only you can see it)</label>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Files</h2>
            <div className="space-y-3">
              {files.map((f, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900">
                    <input className="flex-1 text-sm font-mono bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none" value={f.path} onChange={(e) => updateFile(i, { path: e.target.value })} placeholder="file path" />
                    {files.length > 1 && <button type="button" onClick={() => removeFile(i)} className="text-xs text-gray-400 hover:text-red-600 shrink-0">remove</button>}
                  </div>
                  <textarea className="w-full px-4 py-3 text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none" rows={8} value={f.content} onChange={(e) => updateFile(i, { content: e.target.value })} placeholder="File content…" />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setFiles((c) => c.concat({ path: `file-${c.length + 1}.txt`, content: "" }))} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">+ Add file</button>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={del} className="px-6 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete</button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => router.push(`/prompt/${params.id}`)} className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">{saving ? "Saving…" : "Save changes"}</button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
