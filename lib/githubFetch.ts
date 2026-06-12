// Server-side GitHub repo fetcher shared by the import route and the "Sync from
// GitHub" route. Network-bound (uses global fetch); pure selection/draft logic
// lives in githubImport.ts. Returns a discriminated result instead of HTTP types
// so callers (route handlers) decide the response shape.
import {
  selectFiles,
  buildDraft,
  DEFAULT_CAPS,
  type TreeBlob,
  type RepoRef,
  type ImportDraft,
} from "./githubImport";

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

// Concurrency pool so we don't open hundreds of sockets at once.
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

export type ImportResult =
  | { ok: true; draft: ImportDraft }
  | { ok: false; error: string; status: number };

// Resolve the latest commit SHA on a branch (best-effort).
export async function latestCommitSha(ref: RepoRef, branch: string, token?: string): Promise<string | undefined> {
  try {
    const r = await ghFetch(
      `https://api.github.com/repos/${ref.owner}/${ref.repo}/commits?sha=${encodeURIComponent(branch)}&per_page=1`,
      token,
      8000,
    );
    if (!r.ok) return undefined;
    const arr = (await r.json()) as { sha?: string }[];
    return Array.isArray(arr) && arr[0]?.sha ? arr[0].sha : undefined;
  } catch {
    return undefined;
  }
}

// Fetch a repo's importable text files and assemble an ImportDraft (incl. the
// linked source + HEAD commit). Shared by import + sync.
export async function importRepo(ref: RepoRef, token?: string): Promise<ImportResult> {
  try {
    const metaRes = await ghFetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}`, token);
    if (metaRes.status === 404) return { ok: false, error: "Repo not found (or private — add a token).", status: 404 };
    if (metaRes.status === 403) return { ok: false, error: "GitHub rate limit hit. Add a personal access token and retry.", status: 429 };
    if (!metaRes.ok) return { ok: false, error: `GitHub error (${metaRes.status}).`, status: 502 };
    const meta = (await metaRes.json()) as { default_branch?: string; description?: string | null; language?: string | null };
    const branch = ref.ref || meta.default_branch || "main";

    const commit = await latestCommitSha(ref, branch, token);

    const treeRes = await ghFetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, token);
    if (!treeRes.ok) return { ok: false, error: `Could not read repo tree (${treeRes.status}).`, status: 502 };
    const tree = (await treeRes.json()) as { tree?: { path: string; type: string; size?: number }[] };
    let blobs: TreeBlob[] = (tree.tree || []).filter((e) => e.type === "blob").map((e) => ({ path: e.path, size: e.size ?? 0 }));
    if (ref.subpath) {
      const pre = ref.subpath.replace(/\/$/, "") + "/";
      blobs = blobs.filter((b) => b.path.startsWith(pre)).map((b) => ({ ...b, path: b.path.slice(pre.length) || b.path }));
    }
    if (blobs.length === 0) return { ok: false, error: "No importable files found in that repo/path.", status: 422 };

    const selection = selectFiles(blobs, DEFAULT_CAPS);
    if (selection.selected.length === 0) {
      return { ok: false, error: "Nothing importable (only binaries/build output, or files too large).", status: 422 };
    }

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
    if (files.length === 0) return { ok: false, error: "Could not read any file contents.", status: 502 };

    const draft = buildDraft(ref, { description: meta.description, language: meta.language }, files, selection, { branch, commit });
    return { ok: true, draft };
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "GitHub request timed out." : "Import failed.";
    return { ok: false, error: msg, status: 502 };
  }
}

// The server token used as a fallback so imports survive GitHub's unauthenticated
// rate limit and can reach private repos the token has access to.
export function serverGithubToken(): string | undefined {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined;
}
