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
import { resolveReadme } from "@/lib/markdown";
import { attachmentKind, attachmentLabel } from "@/lib/attachments";
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
import { PrivateShareButton } from "./PrivateShareButton";
import { promptStats } from "@/lib/promptStats";
import { fileAnchorId, fileAnchorLink, parseFileAnchor, activeFileIndex } from "@/lib/fileAnchor";
import { relativeTime } from "@/lib/relativeTime";
import { AssistantLinks } from "./components/AssistantLinks";
import { AgentLinks } from "./components/AgentLinks";
import { useWithSurfaces } from "@/lib/useWith";
import { track, getAnonId } from "./components/AnalyticsBeacon";
import { PlaygroundPanel } from "./PlaygroundPanel";
import { ModelAttestations } from "./ModelAttestations";
import { FileTree } from "./components/FileTree";
import { HighlightedText } from "./components/HighlightedText";
import { searchFiles, MIN_QUERY_LEN } from "@/lib/promptSearch";
import { useToast } from "./components/Toast";

type TestedModel = { modelId: string; version?: string; notes?: string };
type Author = { name: string; image: string | null; handle: string | null };
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
  commentCount?: number;
  priceCents?: number;
  tags?: string[];
  forkedFrom?: { id: string; name: string } | null;
  forkCount?: number;
  readme?: string | null;
  attachments?: { url: string; name?: string }[];
  isSkill?: boolean;
  useWith?: "chat" | "agent" | "both";
  createdAt: string;
  updatedAt?: string | null;
  isStarred?: boolean;
  isOwner?: boolean;
  isCollaborator?: boolean;
  canEdit?: boolean;
  handle?: string;
  slug?: string;
  // Linked GitHub repo (when imported) — shown as a "Linked to …" row.
  sourceUrl?: string;
  sourceRef?: string | null;
  sourceCommit?: string | null;
};

// Render prompt text with {{variables}} resolved to their values, and any
// UNFILLED variable shown as a highlighted chip instead of a confusing blank.
// `activeNames` is the set of real Customize fields; only those are treated as
// variables — every other {{token}} (control words, code examples, or a
// templating-heavy prompt with too many) renders verbatim, never stripped.
function PromptText({
  content,
  values,
  activeNames,
}: {
  content: string;
  values: Record<string, string>;
  activeNames: Set<string>;
}) {
  // Not a fill-in template → show the body exactly as written.
  if (activeNames.size === 0) return <>{content}</>;
  const tokens = tokenizeTemplate(content);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === "text") return <span key={i}>{t.text}</span>;
        if (!activeNames.has(t.name)) {
          // A {{token}} that isn't a Customize field — render it literally.
          return <span key={i}>{t.default ? `{{${t.name}:${t.default}}}` : `{{${t.name}}}`}</span>;
        }
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
  const { toast } = useToast();
  const [stars, setStars] = useState(prompt.stars);
  const [copyCount, setCopyCount] = useState(prompt.copyCount ?? 0);
  const [counted, setCounted] = useState(false);
  const [isStarred, setIsStarred] = useState(prompt.isStarred ?? false);
  const [isPinned, setIsPinned] = useState(false);

  // Record a copy at most once per page view so the counter reflects users, not clicks.
  async function recordCopy() {
    track("prompt_copy", typeof window !== "undefined" ? window.location.pathname : `/prompt/${prompt.id}`, { id: prompt.id });
    if (counted) return;
    setCounted(true);
    setCopyCount((c) => c + 1);
    fetch(`/api/prompts/${prompt.id}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonId: getAnonId() }),
    }).catch(() => {});
  }
  const [values, setValues] = useState<Record<string, string>>({});
  const [imgSrc, setImgSrc] = useState(promptImageSrc(prompt.image, prompt.id, prompt.category));
  const [forking, setForking] = useState(false);
  const [related, setRelated] = useState<React.ComponentProps<typeof PromptCard>[]>([]);
  const [relatedByTag, setRelatedByTag] = useState<React.ComponentProps<typeof PromptCard>[]>([]);
  const [byAuthor, setByAuthor] = useState<React.ComponentProps<typeof PromptCard>[]>([]);
  const [viewCount, setViewCount] = useState(prompt.viewCount ?? 0);
  const [commentCount, setCommentCount] = useState(prompt.commentCount ?? 0);
  const [anchoredFile, setAnchoredFile] = useState<string | null>(null);
  // In-prompt search query (find text across the prompt's files).
  const [search, setSearch] = useState("");
  // Which file tab is open (multi-file prompts render as tabs, not a long stack).
  const [activeFile, setActiveFile] = useState<string | null>(null);

  // On load, if the URL carries a #file=… anchor, open that file's tab, scroll to
  // it and flash it.
  useEffect(() => {
    const path = parseFileAnchor(window.location.hash);
    if (!path) return;
    setAnchoredFile(path);
    setActiveFile(path);
    // Only the active tab renders, so wait a frame for it to mount before scrolling.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(fileAnchorId(path));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const t = setTimeout(() => setAnchoredFile(null), 2000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

  // Record a view once per page load (soft signal, best-effort).
  useEffect(() => {
    track("prompt_view", typeof window !== "undefined" ? window.location.pathname : `/prompt/${prompt.id}`, { id: prompt.id });
    fetch(`/api/prompts/${prompt.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonId: getAnonId() }),
    })
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
    if (!prompt.isOwner) return;
    let active = true;
    fetch("/api/pins")
      .then((r) => (r.ok ? r.json() : { pinned: [] }))
      .then((d) => active && setIsPinned((d.pinned || []).includes(prompt.id)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [prompt.isOwner, prompt.id]);

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
      toast("You can pin up to 3 prompts. Unpin one first.", { variant: "error" });
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
  const activeNames = useMemo(() => new Set(vars.map((v) => v.name)), [vars]);
  // Only substitute when this is a real fill-in template; otherwise keep the body
  // verbatim so a templating-heavy prompt's {{tokens}} aren't blanked out.
  const filled = useMemo(
    () => (vars.length > 0 ? files.map((f) => ({ ...f, content: applyVariables(f.content, values) })) : files),
    [files, values, vars.length],
  );
  const multi = filled.length > 1;
  // In-prompt search: count matches per file so the tree can badge them and the
  // viewer can highlight. Shown for multi-file prompts and longer single files.
  const isSearching = search.trim().length >= MIN_QUERY_LEN;
  const searchResult = useMemo(() => searchFiles(filled, search), [filled, search]);
  const showSearch = multi || (filled.length === 1 && (filled[0]?.content?.length ?? 0) > 400);
  // When the query changes and the open file has no hits, jump to the first file
  // that does — so typing a term lands you on a relevant file without hunting.
  // Keyed on `search` only, so manual file navigation afterwards isn't overridden.
  useEffect(() => {
    if (search.trim().length < MIN_QUERY_LEN || !multi) return;
    const active = filled[activeIdx]?.path;
    const res = searchFiles(filled, search);
    if (active && (res.counts[active] ?? 0) > 0) return;
    const firstHit = filled.find((f) => (res.counts[f.path] ?? 0) > 0);
    if (firstHit) setActiveFile(firstHit.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const allText = filled.map((f) => (multi ? `// ${f.path}\n${f.content}` : f.content)).join("\n\n");
  const readme = useMemo(() => resolveReadme(prompt.readme, files), [prompt.readme, files]);
  // Active tab for multi-file prompts (falls back to the first file).
  const activeIdx = activeFileIndex(filled.map((f) => f.path), activeFile);
  const stats = useMemo(() => promptStats(allText), [allText]);
  const installRef = prompt.handle && prompt.slug ? `${prompt.handle}/${prompt.slug}` : null;
  const imageGen = isImagePrompt({ testedModels: prompt.testedModels, category: prompt.category });
  const imageGenLinks = (prompt.testedModels || [])
    .map((m) => ({ modelId: m.modelId, href: imageModelHome(m.modelId) }))
    .filter((l): l is { modelId: string; href: string } => l.href !== null);
  const author = prompt.author;
  // Owner OR collaborator may edit. Falls back to isOwner for older payloads.
  const canEdit = prompt.canEdit ?? !!prompt.isOwner;

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

        <div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href={`/c/${encodeURIComponent(prompt.category)}`} className="inline-block px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50">
                {prompt.category}
              </Link>
              {prompt.isSkill && (
                <Link href="/browse?skill=1" title="Browse all skills" className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Skill
                </Link>
              )}
              {prompt.useWith && prompt.useWith !== "both" && (
                <Link
                  href={`/browse?useWith=${prompt.useWith}`}
                  title="Browse prompts best used here"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50"
                >
                  {prompt.useWith === "agent" ? "🤖 For coding agents" : "💬 For web chat"}
                </Link>
              )}
              {prompt.isPrivate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md">
                  Private
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md ${isPaid(prompt.priceCents) ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30" : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"}`}>
                {formatPrice(prompt.priceCents ?? 0)}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 break-words">{prompt.name}</h1>
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

            <Link href={prompt.handle || author.handle ? `/u/${prompt.handle || author.handle}` : "#"} className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
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

          <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
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

            <a
              href="#comments"
              title="Comments — jump to discussion"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{commentCount}</span>
            </a>

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

            {prompt.isPrivate && <PrivateShareButton canManage={canEdit} />}

            {prompt.isOwner && !prompt.isPrivate && (
              <button
                onClick={togglePin}
                title={isPinned ? "Unpin from your profile" : "Pin to the top of your profile"}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isPinned
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <svg className="w-5 h-5" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <line x1="12" x2="12" y1="17" y2="22" />
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
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
            <CopyButton text={allText} label="Copy prompt" onCopy={recordCopy} variant="primary" />
          </div>
        </div>
        {prompt.sourceUrl && (
          <GithubLink id={prompt.id} url={prompt.sourceUrl} commit={prompt.sourceCommit ?? null} isOwner={!!prompt.isOwner} />
        )}
        {/* In-prompt search — find text across all files. Especially handy on
            multi-file prompts: matching files get a count badge in the tree and
            matches are highlighted in the open file. */}
        {showSearch && (
          <div className="mb-3">
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 110-14 7 7 0 010 14z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={multi ? "Search across all files…" : "Search in this prompt…"}
                aria-label="Search in prompt"
                className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {isSearching && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
                {searchResult.total > 0
                  ? `${searchResult.total} match${searchResult.total === 1 ? "" : "es"}${
                      multi ? ` in ${searchResult.filesWithMatches} file${searchResult.filesWithMatches === 1 ? "" : "s"}` : ""
                    }`
                  : "No matches"}
              </p>
            )}
          </div>
        )}
        {/* Multi-file: a clickable folder tree (left) + the selected file (right),
            mirroring the repo's real directory structure. Single-file prompts skip
            the tree and just render the one panel. */}
        <div className={multi ? "flex flex-col md:flex-row gap-4 items-start" : undefined}>
          {multi && (
            <div
              className="w-full md:w-64 lg:w-72 shrink-0 self-start md:sticky md:top-20 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 max-h-72 md:max-h-[calc(100vh-6rem)] overflow-auto"
              role="tablist"
              aria-label="Files"
            >
              <FileTree
                paths={filled.map((f) => f.path)}
                activePath={filled[activeIdx]?.path ?? null}
                onSelect={setActiveFile}
                matchCounts={isSearching ? searchResult.counts : undefined}
              />
            </div>
          )}
          <div className={multi ? "min-w-0 flex-1 w-full" : undefined}>
            {(() => {
              const f = filled[activeIdx];
              if (!f) return null;
              return (
                <div
                  key={f.path}
                  id={fileAnchorId(f.path)}
                  role={multi ? "tabpanel" : undefined}
                  className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-colors scroll-mt-20 ${
                    anchoredFile === f.path ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-300/50" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{f.path}</span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 shrink-0">{f.language}</span>
                      {isSearching && (
                        <span className="shrink-0 text-[10px] font-semibold rounded-full bg-yellow-200 dark:bg-yellow-500/40 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 tabular-nums">
                          {searchResult.counts[f.path] ?? 0} here
                        </span>
                      )}
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
                      <CopyButton text={f.content} label="Copy file" />
                    </div>
                  </div>
                  <pre className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words font-mono overflow-x-auto leading-relaxed">{isSearching ? <HighlightedText text={f.content} query={search} /> : <PromptText content={files[activeIdx].content} values={values} activeNames={activeNames} />}</pre>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Attachments — multimodal references (images, video, pdf, docs) an LLM can view */}
      {(prompt.attachments?.length ?? 0) > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Attachments <span className="text-gray-400 font-normal">({prompt.attachments!.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {prompt.attachments!.map((a) => {
              const kind = attachmentKind(a.url);
              const label = attachmentLabel(a);
              return (
                <a
                  key={a.url}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={label}
                  className="group block rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  {kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={label} loading="lazy" className="h-24 w-full object-cover bg-gray-50 dark:bg-gray-900" />
                  ) : (
                    <div className="h-24 w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                      <span className="text-[10px] font-mono uppercase tracking-wide text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded px-2 py-1">
                        {kind}
                      </span>
                    </div>
                  )}
                  <div className="px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {label}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Run/use this prompt (text prompts only) — below the prompt body. Which
          surfaces show depends on the prompt's useWith: web chat assistants for
          "chat", coding-agent copy targets for "agent", both lists for "both". */}
      {!imageGen && (() => {
        const surfaces = useWithSurfaces(prompt.useWith);
        return (
          <div className="mt-6 space-y-4">
            {surfaces.chat && <AssistantLinks text={allText} onOpen={recordCopy} />}
            {surfaces.agent && <AgentLinks text={allText} onCopy={recordCopy} />}
          </div>
        );
      })()}

      {/* Install box */}
      {installRef && (
        <div className="mt-6 flex items-center justify-between gap-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 px-4 py-3">
          <code className="flex-1 min-w-0 text-sm font-mono text-gray-700 dark:text-gray-300 truncate">npx promptinghub add {installRef}</code>
          <div className="shrink-0">
            <CopyButton text={`npx promptinghub add ${installRef}`} label="Copy install" onCopy={recordCopy} />
          </div>
        </div>
      )}

      {/* Tested Models */}
      {prompt.testedModels.length > 0 && (
        <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
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
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 flex items-center justify-between gap-4">
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
        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
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

      {/* Community-tested models — confirm/deny + add models */}
      <div className="mt-6">
        <ModelAttestations promptId={prompt.id} />
      </div>

      {/* Playground — run the (filled) prompt against a model, if configured */}
      <div className="mt-6">
        <PlaygroundPanel text={allText} />
      </div>

      {/* Share */}
      {!prompt.isPrivate && <ShareButtons title={prompt.name} promptId={prompt.id} />}

      {/* Use via API */}
      {!prompt.isPrivate && <ApiSnippet promptId={prompt.id} />}


      {/* Version history */}
      <VersionHistory
        promptId={prompt.id}
        canRestore={canEdit}
        current={{ body: prompt.body, files: prompt.files ?? null }}
      />

      {/* Comments */}
      <div id="comments" className="scroll-mt-20" />
      <Comments promptId={prompt.id} onCount={setCommentCount} />

      {/* Report */}
      {!canEdit && <ReportButton promptId={prompt.id} />}

      {/* Related discovery — kept at the very bottom, below the discussion, so the
          prompt + comments come first (owner: "more in pod komentarzami na samym dole"). */}
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
    </main>
  );
}

// "Linked to github.com/owner/repo @ sha" with an owner-only "Sync from GitHub"
// button that re-pulls the repo's latest commit into this prompt's files.
function GithubLink({ id, url, commit, isOwner }: { id: string; url: string; commit: string | null; isOwner: boolean }) {
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const repoLabel = url.replace(/^https:\/\/github\.com\//i, "");
  const short = commit ? commit.slice(0, 7) : null;

  async function sync() {
    setSyncing(true);
    setMsg(null);
    setOk(false);
    try {
      const r = await fetch(`/api/prompts/${id}/sync-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(d.error || "Sync failed.");
        setSyncing(false);
        return;
      }
      if (d.alreadyCurrent) {
        setOk(true);
        setMsg("Already up to date with the latest commit.");
        setSyncing(false);
        return;
      }
      setOk(true);
      setMsg(`Synced ${d.imported} file${d.imported === 1 ? "" : "s"}${d.commit ? ` @ ${String(d.commit).slice(0, 7)}` : ""}. Reloading…`);
      setTimeout(() => window.location.reload(), 700);
    } catch {
      setMsg("Sync failed — check your connection.");
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 min-w-0"
        title={url}
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
        <span className="truncate">Linked to {repoLabel}{short && <span className="text-gray-400"> @ {short}</span>}</span>
      </a>
      {isOwner && (
        <button
          onClick={sync}
          disabled={syncing}
          className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-60 transition-colors"
          title="Re-pull the latest commit's files from GitHub"
        >
          <svg className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          {syncing ? "Syncing…" : "Sync from GitHub"}
        </button>
      )}
      {msg && (
        <span className={`w-full text-xs ${ok ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{msg}</span>
      )}
    </div>
  );
}
