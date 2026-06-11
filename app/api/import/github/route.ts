import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  parseRepoRef,
  selectFiles,
  buildDraft,
  DEFAULT_CAPS,
  type TreeBlob,
  type RepoRef,
} from "@/lib/githubImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "PromptingHub-Importer";

function ghHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { "User-Agent": UA, Accept: "application/vnd.github+json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function ghFetch(url: string, token: string | undefined, timeoutMs = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { headers: ghHeaders(token), signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

// Fetch with a small concurrency pool so we don't open 40 sockets at once.
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { url?: string; token?: string } | null;
  const ref: RepoRef | null = parseRepoRef(body?.url || "");
  if (!ref) return NextResponse.json({ error: "Not a valid GitHub repo URL." }, { status: 400 });
  const token = typeof body?.token === "string" && body.token.trim() ? body.token.trim() : undefined;

  try {
    // 1) Repo meta → default branch, description, language.
    const metaRes = await ghFetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}`, token);
    if (metaRes.status === 404) return NextResponse.json({ error: "Repo not found (or private — add a token)." }, { status: 404 });
    if (metaRes.status === 403) return NextResponse.json({ error: "GitHub rate limit hit. Add a personal access token and retry." }, { status: 429 });
    if (!metaRes.ok) return NextResponse.json({ error: `GitHub error (${metaRes.status}).` }, { status: 502 });
    const meta = (await metaRes.json()) as { default_branch?: string; description?: string | null; language?: string | null };
    const branch = ref.ref || meta.default_branch || "main";

    // 2) Recursive tree of blobs.
    const treeRes = await ghFetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, token);
    if (!treeRes.ok) return NextResponse.json({ error: `Could not read repo tree (${treeRes.status}).` }, { status: 502 });
    const tree = (await treeRes.json()) as { tree?: { path: string; type: string; size?: number }[]; truncated?: boolean };
    let blobs: TreeBlob[] = (tree.tree || [])
      .filter((e) => e.type === "blob")
      .map((e) => ({ path: e.path, size: e.size ?? 0 }));
    if (ref.subpath) {
      const pre = ref.subpath.replace(/\/$/, "") + "/";
      blobs = blobs.filter((b) => b.path.startsWith(pre)).map((b) => ({ ...b, path: b.path.slice(pre.length) || b.path }));
    }
    if (blobs.length === 0) return NextResponse.json({ error: "No importable files found in that repo/path." }, { status: 422 });

    // 3) Apply allowlist + caps.
    const selection = selectFiles(blobs, DEFAULT_CAPS);
    if (selection.selected.length === 0) {
      return NextResponse.json({ error: "Nothing importable (only binaries/build output, or files too large)." }, { status: 422 });
    }

    // 4) Fetch raw text for selected files (concurrency-limited, size-guarded).
    const prefix = ref.subpath ? ref.subpath.replace(/\/$/, "") + "/" : "";
    const fetched = await pool(selection.selected, 8, async (b) => {
      const rawPath = prefix + b.path;
      const url = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${encodeURIComponent(branch)}/${rawPath.split("/").map(encodeURIComponent).join("/")}`;
      try {
        const r = await ghFetch(url, token, 10000);
        if (!r.ok) return null;
        const text = await r.text();
        if (text.length > DEFAULT_CAPS.maxFileBytes * 2) return null; // defensive
        if (/\x00/.test(text)) return null; // binary guard
        return { path: b.path, content: text };
      } catch {
        return null;
      }
    });
    const files = fetched.filter((f): f is { path: string; content: string } => !!f && f.content.trim().length > 0);
    if (files.length === 0) return NextResponse.json({ error: "Could not read any file contents." }, { status: 502 });

    const draft = buildDraft(ref, { description: meta.description, language: meta.language }, files, selection);
    return NextResponse.json({ draft });
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "GitHub request timed out." : "Import failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
