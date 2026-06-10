// Pure, network-free logic for "import a public GitHub repo as a multi-file prompt"
// (infrastructure-as-a-prompt). The route layer does the actual fetching and
// injects results here. Keeping parse + filtering pure makes it unit-testable.
import { looksLikeSkill } from "./import";

export type RepoRef = { owner: string; repo: string; ref?: string; subpath?: string };

// Accepts: https://github.com/owner/repo, .../tree/<ref>/<subpath>, owner/repo,
// and *.git URLs. Returns null if it doesn't look like a GitHub repo.
export function parseRepoRef(input: string): RepoRef | null {
  const s = (input || "").trim();
  if (!s) return null;

  // Bare "owner/repo" (no scheme, no spaces)
  const bare = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (bare && !s.includes("://") && !s.includes(" ")) {
    return { owner: bare[1], repo: bare[2] };
  }

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  if (!owner || !repo) return null;

  // /owner/repo/tree/<ref>/<subpath...>
  if (parts[2] === "tree" && parts[3]) {
    return { owner, repo, ref: parts[3], subpath: parts.slice(4).join("/") || undefined };
  }
  return { owner, repo };
}

// Allowlist of text/source extensions worth importing as prompt files.
const TEXT_EXT = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs", "py", "rb", "go", "rs", "java", "kt", "kts",
  "swift", "c", "h", "cc", "cpp", "hpp", "cs", "php", "sh", "bash", "zsh", "fish",
  "sql", "graphql", "gql", "proto", "yaml", "yml", "toml", "ini", "cfg", "conf",
  "json", "jsonc", "md", "mdx", "markdown", "txt", "rst", "html", "htm", "css",
  "scss", "sass", "less", "vue", "svelte", "astro", "tf", "tfvars", "hcl", "r",
  "jl", "lua", "pl", "pm", "ex", "exs", "erl", "clj", "cljs", "scala", "dart",
  "gradle", "groovy", "xml", "csv", "tsv", "env", "example", "lock", "properties",
  "make", "mk", "cmake", "nix", "vim", "el", "tex", "bib", "ipynb",
]);

// Files with no/odd extension that are still worth importing.
const SPECIAL_NAMES = new Set([
  "dockerfile", "makefile", "readme", "license", "licence", "changelog",
  "contributing", ".gitignore", ".dockerignore", ".env.example", ".editorconfig",
  ".eslintrc", ".prettierrc", ".npmrc", "procfile", "rakefile", "gemfile", "brewfile",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "out", "vendor", "coverage",
  ".venv", "venv", "__pycache__", "target", ".turbo", "bin", "obj", ".cache",
  ".idea", ".vscode", "tmp", "temp", ".gradle", "pkg", ".terraform",
]);

// Definitely-binary or noise extensions we never import.
const BINARY_EXT = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff", "svg", "pdf", "zip",
  "gz", "tgz", "tar", "rar", "7z", "woff", "woff2", "ttf", "otf", "eot", "mp4",
  "mp3", "wav", "mov", "avi", "webm", "wasm", "so", "dll", "dylib", "exe", "bin",
  "class", "jar", "o", "a", "node", "pyc", "min.js", "min.css", "map",
]);

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}
function extOf(name: string): string {
  const b = name.toLowerCase();
  const dot = b.lastIndexOf(".");
  return dot > 0 ? b.slice(dot + 1) : "";
}

export function isImportablePath(path: string): boolean {
  const segs = path.split("/");
  for (const seg of segs.slice(0, -1)) {
    if (SKIP_DIRS.has(seg.toLowerCase())) return false;
  }
  const name = basename(path).toLowerCase();
  if (name.endsWith(".min.js") || name.endsWith(".min.css")) return false;
  const ext = extOf(name);
  if (ext && BINARY_EXT.has(ext)) return false;
  if (SPECIAL_NAMES.has(name)) return true;
  if (!ext) return false; // unknown, no extension, not special → skip
  return TEXT_EXT.has(ext);
}

export type TreeBlob = { path: string; size: number };
export type ImportCaps = { maxFiles: number; maxFileBytes: number; maxTotalBytes: number };
export const DEFAULT_CAPS: ImportCaps = { maxFiles: 40, maxFileBytes: 96 * 1024, maxTotalBytes: 1_500_000 };

export type Selection = { selected: TreeBlob[]; skipped: number; truncated: boolean };

// Apply allowlist + caps. README-ish files float to the top so the prompt opens
// with context; otherwise keep repo order for stable, intuitive output.
export function selectFiles(blobs: TreeBlob[], caps: ImportCaps = DEFAULT_CAPS): Selection {
  const eligible = blobs.filter((b) => isImportablePath(b.path) && b.size <= caps.maxFileBytes);
  const skippedByFilter = blobs.length - eligible.length;
  eligible.sort((a, b) => {
    const ar = /readme/i.test(basename(a.path)) ? 0 : 1;
    const br = /readme/i.test(basename(b.path)) ? 0 : 1;
    if (ar !== br) return ar - br;
    return a.path.localeCompare(b.path);
  });
  const selected: TreeBlob[] = [];
  let total = 0;
  let truncated = false;
  for (const b of eligible) {
    if (selected.length >= caps.maxFiles || total + b.size > caps.maxTotalBytes) {
      truncated = true;
      break;
    }
    selected.push(b);
    total += b.size;
  }
  return { selected, skipped: skippedByFilter, truncated };
}

export type RepoMeta = { description?: string | null; language?: string | null; stars?: number };

export type ImportDraft = {
  name: string;
  description: string;
  category: string;
  tags: string[];
  files: { path: string; content: string }[];
  notes: { skipped: number; truncated: boolean; imported: number };
  // True when the repo looks like an agent skill (e.g. contains a SKILL.md).
  isSkill?: boolean;
};

export function buildDraft(
  ref: RepoRef,
  meta: RepoMeta,
  files: { path: string; content: string }[],
  selection: Pick<Selection, "skipped" | "truncated">,
): ImportDraft {
  const tags = [ref.repo.toLowerCase(), "github"];
  if (meta.language) tags.push(meta.language.toLowerCase());
  const desc =
    (meta.description && meta.description.trim()) ||
    `Imported from github.com/${ref.owner}/${ref.repo}`;
  const isSkill = looksLikeSkill({ files });
  return {
    name: ref.repo,
    description: `${desc} — github.com/${ref.owner}/${ref.repo}`.slice(0, 280),
    category: "Coding",
    tags: [...new Set(tags)].slice(0, 8),
    files,
    notes: { skipped: selection.skipped, truncated: selection.truncated, imported: files.length },
    ...(isSkill ? { isSkill: true } : {}),
  };
}
