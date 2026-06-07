"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { CopyButton } from "./PromptView";
import { getModelName, getModelProvider, getPlaceholderImage, promptImageSrc } from "@/lib/constants";
import { applyVariables, extractVariablesFromFiles } from "@/lib/template";
import { buildForkInput } from "@/lib/fork";
import { pickReadme } from "@/lib/markdown";
import { Markdown } from "./Markdown";
import { PromptCard } from "./components/PromptCard";

type TestedModel = { modelId: string; version?: string; notes?: string };
type Author = { email: string; name: string; image: string | null };
type PromptFile = { path: string; content: string; language: string };

export type PromptDetail = {
  id: string;
  name: string;
  description: string;
  category: string;
  body: string;
  files: PromptFile[];
  author: Author;
  image: string | null;
  stars: number;
  isPrivate: boolean;
  testedModels: TestedModel[];
  copyCount?: number;
  createdAt: string;
  handle?: string;
  slug?: string;
};

export function PromptDetailView({ prompt }: { prompt: PromptDetail }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [stars, setStars] = useState(prompt.stars);
  const [copyCount, setCopyCount] = useState(prompt.copyCount ?? 0);
  const [counted, setCounted] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  // Record a copy at most once per page view so the counter reflects users, not clicks.
  async function recordCopy() {
    if (counted) return;
    setCounted(true);
    setCopyCount((c) => c + 1);
    fetch(`/api/prompts/${prompt.id}/copy`, { method: "POST" }).catch(() => {});
  }
  const [values, setValues] = useState<Record<string, string>>({});
  const [imgSrc, setImgSrc] = useState(promptImageSrc(prompt.image, prompt.id));
  const [forking, setForking] = useState(false);
  const [related, setRelated] = useState<React.ComponentProps<typeof PromptCard>[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/prompts/${prompt.id}/related`)
      .then((r) => (r.ok ? r.json() : { prompts: [] }))
      .then((d) => active && setRelated(d.prompts || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [prompt.id]);

  async function handleFork() {
    if (!session?.user?.email) {
      router.push("/login");
      return;
    }
    setForking(true);
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildForkInput(prompt, values)),
    });
    if (res.ok) {
      const created = await res.json();
      router.push(`/prompt/${created.id}`);
    } else {
      setForking(false);
    }
  }

  async function toggleStar() {
    if (!session?.user?.email) {
      router.push("/login");
      return;
    }
    const res = await fetch(`/api/prompts/${prompt.id}/star`, { method: "POST" });
    if (res.ok) {
      const body = await res.json().catch(() => null);
      const nowStarred = body && typeof body.isStarred === "boolean" ? body.isStarred : !isStarred;
      setIsStarred(nowStarred);
      setStars((s) => (nowStarred ? s + 1 : Math.max(0, s - 1)));
    }
  }

  const files = prompt.files ?? [];
  const vars = useMemo(() => extractVariablesFromFiles(files), [files]);
  const filled = useMemo(() => files.map((f) => ({ ...f, content: applyVariables(f.content, values) })), [files, values]);
  const multi = filled.length > 1;
  const allText = filled.map((f) => (multi ? `// ${f.path}\n${f.content}` : f.content)).join("\n\n");
  const readme = useMemo(() => pickReadme(files), [files]);
  const installRef = prompt.handle && prompt.slug ? `${prompt.handle}/${prompt.slug}` : null;
  const author = prompt.author;
  const canEdit = session?.user?.email === author.email;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Image banner with placeholder fallback */}
      <div className="mb-6 rounded-xl overflow-hidden">
        <img
          src={imgSrc}
          alt={prompt.name}
          className="w-full h-64 object-cover"
          onError={() => setImgSrc(getPlaceholderImage(prompt.id))}
        />
      </div>

      {/* Header */}
      <div className="mb-6">
        <Link href="/browse" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to browse
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-block px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                {prompt.category}
              </span>
              {prompt.isPrivate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md">
                  Private
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">{prompt.name}</h1>
            {installRef && <div className="text-sm font-mono text-gray-400 dark:text-gray-500 mb-2">{installRef}</div>}
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{prompt.description}</p>

            <Link href={`/user/${author.email}`} className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar name={author.name} image={author.image} size={32} />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{author.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(prompt.createdAt).toLocaleDateString()}</div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleStar}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isStarred
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <svg className="w-5 h-5" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>{stars}</span>
            </button>

            <span
              title="Times copied or installed"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copyCount}</span>
            </span>

            <button
              onClick={handleFork}
              disabled={forking}
              title={vars.length > 0 ? "Save a copy with your filled-in values" : "Save a copy to your account"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7a2 2 0 110-4 2 2 0 010 4zm0 0v1a2 2 0 002 2h4a2 2 0 002 2v1m0 0a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <span>{forking ? "Forking…" : "Fork"}</span>
            </button>

            {canEdit && (
              <Link href={`/prompt/${prompt.id}/edit`} className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors">
                Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Install box */}
      {installRef && (
        <div className="mb-6 flex items-center justify-between gap-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 px-4 py-3">
          <code className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">npx promptinghub add {installRef}</code>
          <CopyButton text={`npx promptinghub add ${installRef}`} label="Copy install" onCopy={recordCopy} />
        </div>
      )}

      {/* Tested Models */}
      {prompt.testedModels.length > 0 && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Tested on {prompt.testedModels.length} {prompt.testedModels.length === 1 ? "model" : "models"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prompt.testedModels.map((model, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="font-medium text-gray-900 dark:text-white text-sm">{getModelName(model.modelId)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{getModelProvider(model.modelId)}</div>
                {model.version && <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Version: {model.version}</div>}
                {model.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">{model.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customize panel ({{variable}} templates) */}
      {vars.length > 0 && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Customize ({vars.length})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vars.map((v) => (
              <label key={v.name} className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-mono text-gray-500 dark:text-gray-400">{v.name}</span>
                <input
                  className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={v.default || v.name}
                  value={values[v.name] ?? ""}
                  onChange={(e) => setValues((cur) => ({ ...cur, [v.name]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* README (rendered markdown), shown above the files when present */}
      {readme && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <Markdown src={readme} />
        </div>
      )}

      {/* Files */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{multi ? `${filled.length} files` : "Prompt"}</h2>
          <CopyButton text={allText} label={multi ? "Copy all" : "Copy"} onCopy={recordCopy} />
        </div>
        {filled.map((f) => (
          <div key={f.path} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{f.path}</span>
                <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 shrink-0">{f.language}</span>
              </div>
              <CopyButton text={f.content} />
            </div>
            <pre className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words font-mono overflow-x-auto leading-relaxed">{f.content}</pre>
          </div>
        ))}
      </div>

      {/* Related prompts (same category) */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">More in {prompt.category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((p) => (
              <PromptCard key={p.id} {...p} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
