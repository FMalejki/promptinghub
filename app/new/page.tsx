"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "../components/Navbar";
import { PROMPT_CATEGORIES } from "@/lib/constants";
import { useModels } from "@/lib/useModels";
import { getTemplate } from "@/lib/templates";
import { CoverImageField } from "../components/CoverImageField";
import { AttachmentsField, type DraftAttachment } from "../components/AttachmentsField";
import { track } from "../components/AnalyticsBeacon";

type TestedModel = { modelId: string; version?: string; notes?: string };
type DraftFile = { path: string; content: string };

export default function NewPromptPage() {
  const { status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    image: "",
    isPrivate: false,
    isSkill: false,
    useWith: "both" as "chat" | "agent" | "both",
  });
  const [price, setPrice] = useState("0");
  const [readme, setReadme] = useState("");
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [shareWith, setShareWith] = useState("");
  const [tags, setTags] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [similar, setSimilar] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => (r.ok ? r.json() : { tags: [] }))
      .then((d) => setTagSuggestions((d.tags || []).map((t: { tag: string }) => t.tag)))
      .catch(() => {});
  }, []);

  // Prefill from a starter template (/new?template=<id>), applied once on mount.
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("template");
    if (!id) return;
    const t = getTemplate(id);
    if (!t) return;
    setForm((f) => ({ ...f, name: t.promptName, description: t.description, category: t.category }));
    setTags(t.tags.join(", "));
    setFiles([{ path: "prompt.txt", content: t.body }]);
    setAppliedTemplate(t.title);
  }, []);

  function addTag(tag: string) {
    const current = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (current.includes(tag)) return;
    setTags([...current, tag].join(", "));
  }
  const [files, setFiles] = useState<DraftFile[]>([{ path: "prompt.txt", content: "" }]);
  const [dragging, setDragging] = useState(false);
  const [testedModels, setTestedModels] = useState<TestedModel[]>([]);
  const AI_MODELS = useModels();
  const [modelQuery, setModelQuery] = useState("");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [modelVersions, setModelVersions] = useState<Record<string, string>>({});
  const [modelNotes, setModelNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [ghUrl, setGhUrl] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [ghImporting, setGhImporting] = useState(false);
  const [ghNote, setGhNote] = useState<string | null>(null);

  // Debounced check for existing prompts with a similar name (duplicate warning).
  useEffect(() => {
    const name = form.name.trim();
    if (name.length < 4) {
      setSimilar([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/prompts/similar?name=${encodeURIComponent(name)}`)
        .then((r) => (r.ok ? r.json() : { similar: [] }))
        .then((d) => setSimilar(d.similar || []))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [form.name]);

  // Parse pasted text (optionally with --- frontmatter) into the form. Preview-only:
  // the server returns a draft, the user reviews/edits it, then submits as usual.
  async function applyImport() {
    if (!importText.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText, source: "paste" }),
      });
      if (!res.ok) {
        setError("Could not parse that text.");
        return;
      }
      const { draft } = await res.json();
      track("import_click", "/new", { source: "paste" });
      setForm((f) => ({ ...f, name: draft.name, description: draft.description, category: draft.category, isSkill: f.isSkill || !!draft.isSkill }));
      setFiles([{ path: "prompt.txt", content: draft.body }]);
      if (Array.isArray(draft.testedModels)) {
        setSelectedModels(new Set(draft.testedModels.map((m: TestedModel) => m.modelId)));
        setTestedModels(draft.testedModels);
      }
      setImportText("");
    } finally {
      setImporting(false);
    }
  }

  // Import a whole public GitHub repo as a multi-file prompt ("infra as a prompt").
  async function applyGithubImport() {
    if (!ghUrl.trim()) return;
    setGhImporting(true);
    setError(null);
    setGhNote(null);
    try {
      const res = await fetch("/api/import/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ghUrl.trim(), token: ghToken.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "GitHub import failed.");
        return;
      }
      const d = data.draft;
      track("import_click", "/new", { source: "github" });
      setForm((f) => ({ ...f, name: d.name, description: d.description, category: d.category, isSkill: f.isSkill || !!d.isSkill }));
      if (Array.isArray(d.tags)) setTags(d.tags.join(", "));
      if (Array.isArray(d.files) && d.files.length) setFiles(d.files.map((x: { path: string; content: string }) => ({ path: x.path, content: x.content })));
      const n = d.notes || {};
      setGhNote(`Imported ${n.imported} file${n.imported === 1 ? "" : "s"}${n.skipped ? `, skipped ${n.skipped}` : ""}${n.truncated ? " (truncated to fit limits)" : ""}. Review below before publishing.`);
      setGhUrl("");
      setGhToken("");
    } catch {
      setError("GitHub import failed.");
    } finally {
      setGhImporting(false);
    }
  }

  // Don't flash a blank page while the session resolves, and don't hard-redirect
  // unauthenticated visitors — show a Navbar + a clear sign-in CTA instead.
  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {status === "loading" ? (
            <p className="text-center text-gray-400">Loading…</p>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign in to create a prompt</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">You need an account to publish prompts to PromptingHub. It's free.</p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/login?callbackUrl=/new" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">Sign in</Link>
                <Link href="/register" className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Create account</Link>
              </div>
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                Meanwhile, <Link href="/templates" className="text-blue-600 dark:text-blue-400 hover:underline">browse prompt templates</Link> or{" "}
                <Link href="/browse" className="text-blue-600 dark:text-blue-400 hover:underline">explore the community</Link>.
              </p>
            </div>
          )}
        </main>
      </div>
    );
  }

  function toggleModel(modelId: string) {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId);
      const newVersions = { ...modelVersions };
      const newNotes = { ...modelNotes };
      delete newVersions[modelId];
      delete newNotes[modelId];
      setModelVersions(newVersions);
      setModelNotes(newNotes);
    } else {
      newSelected.add(modelId);
    }
    setSelectedModels(newSelected);
  }

  function addFiles(incoming: DraftFile[]) {
    if (!incoming.length) return;
    setFiles((cur) => {
      const blankOnly = cur.length === 1 && !cur[0].content.trim() && cur[0].path === "prompt.txt";
      return (blankOnly ? [] : cur).concat(incoming);
    });
  }
  async function readFileList(list: FileList) {
    const read = await Promise.all(Array.from(list).map(async (f) => ({ path: f.name, content: await f.text() })));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payloadFiles = files
      .filter((f) => f.content.trim().length)
      .map((f) => ({ path: f.path.trim() || "prompt.txt", content: f.content }));
    if (!payloadFiles.length) {
      setError("Add at least one file with content.");
      return;
    }
    setSaving(true);

    // Build tested models array
    const models: TestedModel[] = Array.from(selectedModels).map((modelId) => ({
      modelId,
      version: modelVersions[modelId] || undefined,
      notes: modelNotes[modelId] || undefined,
    }));

    const data = {
      ...form,
      files: payloadFiles,
      image: form.image || undefined,
      testedModels: models.length > 0 ? models : undefined,
      priceCents: Math.round((parseFloat(price) || 0) * 100),
      tags: tags.trim() ? tags : undefined,
      readme: readme.trim() ? readme : undefined,
      attachments: attachments.filter((a) => a.url.trim()).length ? attachments.filter((a) => a.url.trim()) : undefined,
      sharedWith: form.isPrivate && shareWith.trim() ? shareWith : undefined,
    };

    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to create prompt");
        setSaving(false);
        return;
      }

      const created = await res.json();
      router.push(`/prompt/${created.id}`);
    } catch (err) {
      setError("Failed to create prompt");
      setSaving(false);
    }
  }

  const input = "w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";
  const label = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create New Prompt</h1>
              <p className="text-gray-600 dark:text-gray-400">Share your prompt with the community</p>
            </div>
            <a
              href="/templates"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              ✨ Start from a template
            </a>
          </div>
          {appliedTemplate && (
            <div className="mt-4 flex items-center gap-2 text-sm rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-blue-800 dark:text-blue-300">
              <span>✨ Started from the “{appliedTemplate}” template — replace the {"{{placeholders}}"} with your details.</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick import: paste existing prompt text to pre-fill the form */}
          <details className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
            <summary className="cursor-pointer text-sm font-semibold text-blue-800 dark:text-blue-300">
              Import from text — paste a prompt to auto-fill
            </summary>
            <p className="mt-3 text-xs text-blue-700/80 dark:text-blue-300/70">
              Paste your prompt — we&apos;ll fill in the title, category and the rest below for you to review.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={5}
              placeholder={"Paste your prompt here…\n\ne.g. You are an expert code reviewer. Review the diff I paste and flag bugs, security issues, and unclear naming…"}
              className={`${input} mt-3 font-mono text-sm`}
            />
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-blue-700/70 dark:text-blue-300/60 hover:underline">
                Advanced: set fields with frontmatter
              </summary>
              <p className="mt-1.5 text-[11px] text-blue-700/70 dark:text-blue-300/60">
                Start with a <code className="font-mono">---</code> block to preset fields:{" "}
                <code className="font-mono">name</code>, <code className="font-mono">description</code>,{" "}
                <code className="font-mono">category</code>, <code className="font-mono">models</code> — then{" "}
                <code className="font-mono">---</code> and your prompt.
              </p>
            </details>
            <button
              type="button"
              onClick={applyImport}
              disabled={importing || !importText.trim()}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {importing ? "Parsing…" : "Fill form from text"}
            </button>
          </details>

          {/* Import a whole public GitHub repo as a multi-file prompt */}
          <details className="bg-gray-900 dark:bg-gray-950 rounded-xl border border-gray-700 p-6">
            <summary className="cursor-pointer text-sm font-semibold text-gray-100 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
              Import from GitHub — paste a public repo URL
            </summary>
            <p className="mt-3 text-xs text-gray-400">
              Pulls the repo&apos;s text/source files into a multi-file prompt (skips binaries &amp; build dirs; up to 40 files / 1.5 MB). Review before publishing.
            </p>
            <input
              type="text"
              value={ghUrl}
              onChange={(e) => setGhUrl(e.target.value)}
              placeholder="https://github.com/owner/repo  (or owner/repo, or .../tree/branch/path)"
              className={`${input} mt-3 font-mono text-sm`}
            />
            <input
              type="password"
              name="gh-pat"
              value={ghToken}
              onChange={(e) => setGhToken(e.target.value)}
              placeholder="Optional GitHub token (private repos / higher rate limit)"
              className={`${input} mt-2 font-mono text-sm`}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
              data-form-type="other"
            />
            <button
              type="button"
              onClick={applyGithubImport}
              disabled={ghImporting || !ghUrl.trim()}
              className="mt-3 px-4 py-2 bg-gray-100 hover:bg-white text-gray-900 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors"
            >
              {ghImporting ? "Importing…" : "Import repo"}
            </button>
            {ghNote && <p className="mt-3 text-xs text-green-400">{ghNote}</p>}
          </details>

          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>

            <div>
              <label className={label}>Prompt Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={input}
                placeholder="e.g., Code Review Assistant"
                required
                maxLength={100}
              />
              {similar.length > 0 && (
                <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  Similar prompts already exist:{" "}
                  {similar.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && ", "}
                      <a href={`/prompt/${s.id}`} target="_blank" rel="noreferrer" className="underline hover:no-underline">
                        {s.name}
                      </a>
                    </span>
                  ))}
                  . Consider forking one instead of duplicating.
                </div>
              )}
            </div>

            <div>
              <label className={label}>Short Description *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={input}
                placeholder="Brief description of what this prompt does"
                required
                maxLength={300}
              />
            </div>

            <div>
              <label className={label}>Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={input}
                required
              >
                <option value="">Select a category</option>
                {PROMPT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label}>Tags (optional)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className={input}
                placeholder="cold-email, seo, gpt-4"
                maxLength={400}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Comma-separated. Up to 10 tags help people find your prompt.</p>
              {tagSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500 self-center">Popular:</span>
                  {tagSuggestions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTag(t)}
                      className="px-2 py-0.5 text-xs rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={label}>README (optional)</label>
              <textarea
                value={readme}
                onChange={(e) => setReadme(e.target.value)}
                className={`${input} font-mono min-h-[120px]`}
                placeholder={"# How to use this prompt\n\nExplain what it does, when to use it, and any setup. Markdown supported."}
                maxLength={20000}
                rows={6}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Shown at the top of the prompt page. Markdown supported (headings, lists, code, links).</p>
            </div>

            <AttachmentsField value={attachments} onChange={setAttachments} inputClassName={input} labelClassName={label} />

            <CoverImageField
              value={form.image}
              onChange={(v) => setForm({ ...form, image: v })}
              inputClassName={input}
              labelClassName={label}
            />

            <div>
              <label className={label}>Price (USD) — 0 = free</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={input}
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-400">Marketplace is in preview — payments aren’t live yet.</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isSkill"
                checked={form.isSkill}
                onChange={(e) => setForm({ ...form, isSkill: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="isSkill" className="text-sm text-gray-700 dark:text-gray-300">
                This is a <strong>skill</strong> (a reusable capability for an agent/assistant)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Best used with</label>
              <div className="flex flex-wrap gap-2">
                {([
                  ["both", "↔️ Chat & agents"],
                  ["chat", "💬 Web chat"],
                  ["agent", "🤖 Coding agents"],
                ] as const).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm({ ...form, useWith: val })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.useWith === val
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">Where this prompt works best — a web chat UI, a coding agent, or both.</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={form.isPrivate}
                onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isPrivate" className="text-sm text-gray-700 dark:text-gray-300">
                Make this prompt private (only you can see it)
              </label>
            </div>

            {form.isPrivate && (
              <div className="mt-3 pl-6">
                <label htmlFor="shareWith" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Share with (emails)
                </label>
                <textarea
                  id="shareWith"
                  value={shareWith}
                  onChange={(e) => setShareWith(e.target.value)}
                  rows={2}
                  placeholder="alice@example.com, bob@example.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Comma- or newline-separated. These people (plus you) can view this private prompt. Leave empty to keep it just yours.
                </p>
              </div>
            )}
          </div>

          {/* Prompt Files */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Prompt Files</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              A prompt can be one file or a whole package (.md .py .yaml .ts …). Use{" "}
              <code className="text-gray-800 dark:text-gray-200">{"{{variable}}"}</code> or{" "}
              <code className="text-gray-800 dark:text-gray-200">{"{{variable:default}}"}</code> for fields users can fill in.
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm mb-4 transition-colors ${
                dragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300"
                  : "border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              Drag &amp; drop files here, or{" "}
              <label className="text-blue-600 dark:text-blue-400 underline cursor-pointer">
                select files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) readFileList(e.target.files); e.target.value = ""; }}
                />
              </label>
            </div>

            <div className="space-y-3">
              {files.map((f, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900">
                    <input
                      className="flex-1 text-sm font-mono bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
                      value={f.path}
                      placeholder="file path e.g. prompt.md"
                      onChange={(e) => updateFile(i, { path: e.target.value })}
                    />
                    {files.length > 1 && (
                      <button type="button" onClick={() => removeFile(i)} className="text-xs text-gray-400 hover:text-red-600 shrink-0">remove</button>
                    )}
                  </div>
                  <textarea
                    className="w-full px-4 py-3 text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
                    rows={8}
                    placeholder="File content…"
                    value={f.content}
                    onChange={(e) => updateFile(i, { content: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addFiles([{ path: `file-${files.length + 1}.txt`, content: "" }])}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add file
            </button>
          </div>

          {/* Tested Models */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tested AI Models</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the AI models you've tested this prompt with (optional)
            </p>

            {(() => {
              const q = modelQuery.trim().toLowerCase();
              const visibleModels = q
                ? AI_MODELS.filter(
                    (m) =>
                      m.name.toLowerCase().includes(q) ||
                      m.provider.toLowerCase().includes(q) ||
                      m.id.toLowerCase().includes(q),
                  )
                : (() => {
                    // Default to a manageable common set (the live catalogue can be
                    // 300+ models); always keep anything already selected visible.
                    const top = AI_MODELS.slice(0, 24);
                    const ids = new Set(top.map((t) => t.id));
                    const selectedExtra = AI_MODELS.filter((m) => selectedModels.has(m.id) && !ids.has(m.id));
                    return [...top, ...selectedExtra];
                  })();
              return (
                <>
                  <input
                    type="text"
                    value={modelQuery}
                    onChange={(e) => setModelQuery(e.target.value)}
                    placeholder={`Search ${AI_MODELS.length} models…`}
                    className="w-full mb-3 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                  <div className="space-y-3 max-h-96 overflow-y-auto">
              {visibleModels.map((model) => (
                <div key={model.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`model-${model.id}`}
                      checked={selectedModels.has(model.id)}
                      onChange={() => toggleModel(model.id)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <label htmlFor={`model-${model.id}`} className="block">
                        <div className="font-medium text-gray-900 dark:text-white">{model.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{model.provider}</div>
                      </label>

                      {selectedModels.has(model.id) && (
                        <div className="mt-3 space-y-2">
                          <input
                            type="text"
                            value={modelVersions[model.id] || ""}
                            onChange={(e) => setModelVersions({ ...modelVersions, [model.id]: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="Version (e.g., gpt-4-0125-preview)"
                          />
                          <input
                            type="text"
                            value={modelNotes[model.id] || ""}
                            onChange={(e) => setModelNotes({ ...modelNotes, [model.id]: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="Notes (e.g., Works best with temperature 0.7)"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
                  </div>
                  {q && visibleModels.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No models match “{modelQuery}”.</p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? "Creating..." : "Create Prompt"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// Made with Bob
