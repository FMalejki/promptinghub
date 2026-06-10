"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { CopyButton } from "./PromptView";
import { getModelName, getModelProvider, getPlaceholderImage, promptImageSrc } from "@/lib/constants";
import { applyVariables, extractVariablesFromFiles, tokenizeTemplate } from "@/lib/template";
import { buildForkInput } from "@/lib/fork";
import { pickReadme } from "@/lib/markdown";
import { Markdown } from "./Markdown";
import { PromptCard } from "./components/PromptCard";
import { SaveToCollection } from "./SaveToCollection";
import { isImagePrompt, imageModelHome } from "@/lib/imageModels";
import { isVerifiedHandle } from "@/lib/verified";
import { formatPrice, isPaid } from "@/lib/pricing";
import { Comments } from "./Comments";
import { VersionHistory } from "./VersionHistory";
import { ApiSnippet } from "./ApiSnippet";
import { ReportButton } from "./ReportButton";
import { ShareButtons } from "./ShareButtons";
import { promptStats } from "@/lib/promptStats";
import { fileAnchorId, fileAnchorLink, parseFileAnchor } from "@/lib/fileAnchor";
import { relativeTime } from "@/lib/relativeTime";
import { AssistantLinks } from "./components/AssistantLinks";
import { PlaygroundPanel } from "./PlaygroundPanel";
import { ModelAttestations } from "./ModelAttestations";

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
  viewCount?: number;
  priceCents?: number;
  tags?: string[];
  forkedFrom?: { id: string; name: string } | null;
  forkCount?: number;
  createdAt: string;
  updatedAt?: string | null;
  isStarred?: boolean;
  handle?: string;
  slug?: string;
};

// Render prompt text with {{variables}} resolved to their values, and any
// UNFILLED variable shown as a highlighted chip instead of a confusing blank.
function PromptText({ content, values }: { content: string; values: Record<string, string> }) {
  const tokens = tokenizeTemplate(content);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === "text") return <span key={i}>{t.text}</span>;
        const v = values[t.name];
        const resolved = v !== undefined && v !== "" ? v : t.default;
        if (resolved) return <span key={i}>{resolved}</span>;
        return (
          <span
            key={i}
            title={`Unfilled variable — set "${t.name}" in Customize above`}
            className="inline rounded border border-amber-300/70 dark:border-amber-700/60 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1 py-0.5 text-xs font-medium align-baseline"
          >
            {`{{${t.name}}}`}
          </span>
        );
      })}
    </>
  );
}

export function PromptDetailView({ prompt }: { prompt: PromptDetail }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [stars, setStars] = useState(prompt.stars);
  const [copyCount, setCopyCount] = useState(prompt.copyCount ?? 0);
  const [counted, setCounted] = useState(false);
  const [isStarred, setIsStarred] = useState(prompt.isStarred ?? false);
  const [isPinned, setIsPinned] = useState(false);

  // Record a copy at most once per page view so the counter reflects users, not clicks.
  async function recordCopy() {
    if (counted) return;
    setCounted(true);
    setCopyCount((c) => c + 1);
    fetch(`/api/prompts/${prompt.id}/copy`, { method: "POST" }).catch(() => {});
  }
  const [values, setValues] = useState<Record<string, string>>({});
  const [imgSrc, setImgSrc] = useState(promptImageSrc(prompt.image, prompt.id, prompt.category));
  const [forking, setForking] = useState(false);
  const [related, setRelated] = useState<React.ComponentProps<typeof PromptCard>[]>([]);
  const [relatedByTag, setRelatedByTag] = useState<React.ComponentProps<typeof PromptCard>[]>([]);
  const [byAuthor, setByAuthor] = useState<React.ComponentProps<typeof PromptCard>[]>([]);
  const [viewCount, setViewCount] = useState(prompt.viewCount ?? 0);
  const [anchoredFile, setAnchoredFile] = useState<string | null>(null);

  // On load, if the URL carries a #file=… anchor, scroll to that file and flash it.
  useEffect(() => {
    const path = parseFileAnchor(window.location.hash);
    if (!path) return;
    setAnchoredFile(path);
    const el = document.getElementById(fileAnchorId(path));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setAnchoredFile(null), 2000);
    return () => clearTimeout(t);
  }, []);

  // Record a view once per page load (soft signal, best-effort).
  useEffect(() => {
    fetch(`/api/prompts/${prompt.id}/view`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && typeof d.viewCount === "number" && setViewCount(d.viewCount))
      .catch(() => {});
  }, [prompt.id]);

  useEffect(() => {
    let active = true;
    fetch(`/api/prompts/${prompt.id}/related`)
      .then((r) => (r.ok ? r.json() : { prompts: [], byTag: [] }))
      .then((d) => {
        if (!active) return;
        setRelated(d.prompts || []);
        setRelatedByTag(d.byTag || []);
        setByAuthor(d.byAuthor || []);
      })
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

  // Owners can pin a prompt to the top of their public profile.
  useEffect(() => {
    if (session?.user?.email !== prompt.author.email) return;
    let active = true;
    fetch("/api/pins")
      .then((r) => (r.ok ? r.json() : { pinned: [] }))
      .then((d) => active && setIsPinned((d.pinned || []).includes(prompt.id)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session?.user?.email, prompt.author.email, prompt.id]);

  async function togglePin() {
    const res = await fetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptId: prompt.id }),
    });
    if (res.ok) {
      const body = await res.json().catch(() => null);
      setIsPinned(Array.isArray(body?.pinned) ? body.pinned.includes(prompt.id) : !isPinned);
    } else if (res.status === 400) {
      alert("You can pin up to 3 prompts. Unpin one first.");
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
  const stats = useMemo(() => promptStats(allText), [allText]);
  const installRef = prompt.handle && prompt.slug ? `${prompt.handle}/${prompt.slug}` : null;
  const imageGen = isImagePrompt({ testedModels: prompt.testedModels, category: prompt.category });
  const imageGenLinks = (prompt.testedModels || [])
    .map((m) => ({ modelId: m.modelId, href: imageModelHome(m.modelId) }))
    .filter((l): l is { modelId: string; href: string } => l.href !== null);
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
          onError={() => setImgSrc(getPlaceholderImage(prompt.id, prompt.category))}
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
              <Link href={`/c/${encodeURIComponent(prompt.category)}`} className="inline-block px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50">
                {prompt.category}
              </Link>
              {prompt.isPrivate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md">
                  Private
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md ${isPaid(prompt.priceCents) ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30" : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"}`}>
                {formatPrice(prompt.priceCents ?? 0)}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">{prompt.name}</h1>
            {installRef && <div className="text-sm font-mono text-gray-400 dark:text-gray-500 mb-2">{installRef}</div>}
            {prompt.forkedFrom && (
              <div className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7a2 2 0 110-4 2 2 0 010 4zm0 0v1a2 2 0 002 2h4a2 2 0 002 2v1m0 0a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                Forked from{" "}
                <Link href={`/prompt/${prompt.forkedFrom.id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  {prompt.forkedFrom.name}
                </Link>
              </div>
            )}
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{prompt.description}</p>

            {prompt.tags && prompt.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {prompt.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/t/${encodeURIComponent(t)}`}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}

            <Link href={prompt.handle ? `/u/${prompt.handle}` : `/user/${author.email}`} className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar name={author.name} image={author.image} size={32} />
              <div>
                <div className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white">
                  {author.name}
                  {prompt.handle && isVerifiedHandle(prompt.handle) && (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20" aria-label="Verified">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(prompt.createdAt).toLocaleDateString()}
                  {prompt.updatedAt && <span title={new Date(prompt.updatedAt).toLocaleString()}> · updated {relativeTime(prompt.updatedAt)}</span>}
                </div>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleStar}
              aria-pressed={isStarred}
              aria-label={isStarred ? "Unstar this prompt" : "Star this prompt"}
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

            <span
              title="Times viewed"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{viewCount}</span>
            </span>

            {(prompt.forkCount ?? 0) > 0 && (
              <span
                title="Number of forks"
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7a2 2 0 110-4 2 2 0 010 4zm0 0v1a2 2 0 002 2h4a2 2 0 002 2v1m0 0a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                <span>{prompt.forkCount}</span>
              </span>
            )}

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

            <SaveToCollection promptId={prompt.id} />

            {canEdit && !prompt.isPrivate && (
              <button
                onClick={togglePin}
                title={isPinned ? "Unpin from your profile" : "Pin to the top of your profile"}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isPinned
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <svg className="w-5 h-5" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 20 20">
                  <path d="M9.828 1.172a.5.5 0 00-.707 0L7.05 3.243a2 2 0 01-1.137.566l-2.31.33a.5.5 0 00-.277.853l1.672 1.63a2 2 0 01.575 1.77l-.394 2.3a.5.5 0 00.726.527l2.066-1.086a2 2 0 011.86 0l2.066 1.086a.5.5 0 00.725-.527l-.394-2.3a2 2 0 01.575-1.77l1.672-1.63a.5.5 0 00-.277-.853l-2.31-.33a2 2 0 01-1.137-.566L9.828 1.172z" />
                </svg>
                <span>{isPinned ? "Pinned" : "Pin"}</span>
              </button>
            )}

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

      {/* Paid prompt — marketplace is in preview (no live payments yet) */}
      {isPaid(prompt.priceCents) && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-green-800 dark:text-green-300">{formatPrice(prompt.priceCents ?? 0)}</div>
            <div className="text-xs text-green-700/80 dark:text-green-300/70">Marketplace is in preview — payments aren’t live yet.</div>
          </div>
          <button
            disabled
            title="Payments are coming soon"
            className="px-4 py-2 rounded-lg font-medium bg-green-600/60 text-white cursor-not-allowed"
          >
            Buy (coming soon)
          </button>
        </div>
      )}

      {/* Image-gen: quick links to each tested image model's playground */}
      {imageGen && imageGenLinks.length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-800 dark:text-purple-300 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Image-generation prompt — open a model to run it
          </div>
          <div className="flex flex-wrap gap-2">
            {imageGenLinks.map((l) => (
              <a key={l.modelId} href={l.href} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                Open {getModelName(l.modelId)} ↗
              </a>
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

      {/* Run this prompt in an assistant (text prompts only) */}
      {!imageGen && <AssistantLinks text={allText} onOpen={recordCopy} />}

      {/* Files */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">{multi ? `${filled.length} files` : "Prompt"}</h2>
            <span
              title={`${stats.words} words · ${stats.chars} characters · ~${stats.tokens} tokens (estimate)`}
              className="text-xs text-gray-400 dark:text-gray-500 truncate"
            >
              {stats.words} words · ~{stats.tokens} tokens
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!prompt.isPrivate && (
              <>
                <a
                  href={`/api/prompts/${prompt.id}/raw`}
                  target="_blank"
                  rel="noreferrer"
                  title="Plain-text version (pipe-friendly)"
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Raw
                </a>
                <a
                  href={`/api/prompts/${prompt.id}/raw?format=md&download=1`}
                  title="Download this prompt as a Markdown file"
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Download .md
                </a>
              </>
            )}
            <CopyButton text={allText} label={multi ? "Copy all" : "Copy"} onCopy={recordCopy} />
          </div>
        </div>
        {filled.map((f, i) => (
          <div
            key={f.path}
            id={fileAnchorId(f.path)}
            className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-colors scroll-mt-20 ${
              anchoredFile === f.path ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-300/50" : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{f.path}</span>
                <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 shrink-0">{f.language}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {multi && (
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(fileAnchorLink(window.location.href, f.path)).catch(() => {});
                    }}
                    title="Copy a link to this file"
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Link
                  </button>
                )}
                <CopyButton text={f.content} />
              </div>
            </div>
            <pre className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words font-mono overflow-x-auto leading-relaxed"><PromptText content={files[i].content} values={values} /></pre>
          </div>
        ))}
      </div>

      {/* Community-tested models — confirm/deny + add models */}
      <div className="mt-6">
        <ModelAttestations promptId={prompt.id} />
      </div>

      {/* Playground — run the (filled) prompt against a model, if configured */}
      <div className="mt-6">
        <PlaygroundPanel text={allText} />
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

      {/* Related by tag */}
      {relatedByTag.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Similar tags</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedByTag.map((p) => (
              <PromptCard key={p.id} {...p} />
            ))}
          </div>
        </div>
      )}

      {/* More from the same author */}
      {byAuthor.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">More from {author.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {byAuthor.map((p) => (
              <PromptCard key={p.id} {...p} />
            ))}
          </div>
        </div>
      )}

      {/* Share */}
      {!prompt.isPrivate && <ShareButtons title={prompt.name} promptId={prompt.id} />}

      {/* Use via API */}
      {!prompt.isPrivate && <ApiSnippet promptId={prompt.id} />}

      {!prompt.isPrivate && (
        <div className="mt-4">
          <Link href={`/compare?a=${prompt.id}`} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            ⇄ Compare this prompt with another
          </Link>
        </div>
      )}

      {/* Version history */}
      <VersionHistory
        promptId={prompt.id}
        canRestore={canEdit}
        current={{ body: prompt.body, files: prompt.files ?? null }}
      />

      {/* Comments */}
      <Comments promptId={prompt.id} />

      {/* Report */}
      {!canEdit && <ReportButton promptId={prompt.id} />}
    </main>
  );
}
