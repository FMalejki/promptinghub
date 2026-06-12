// Pure relevance scoring for prompt search. Weights matches by field:
// name > tags > description, with full-query, prefix, whole-word, and fuzzy
// (single-typo) credit so multi-word and slightly-misspelled queries still hit.

export type SearchablePrompt = { id: string; name: string; description?: string; tags?: string[] };

// Escape a user string so it is matched literally inside a MongoDB $regex
// (so symbol queries like ".*" or "c++" can't act as a raw regex).
export function escapeRegex(s: string): string {
  return (s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Small, high-signal synonym map so common short/long forms find each other
// ("gpt" → ChatGPT prompts, "img" → image prompts). Bidirectional entries are
// listed explicitly. A synonym hit scores modestly (below a direct match) so it
// never outranks an exact name match.
const SYNONYMS: Record<string, string[]> = {
  gpt: ["chatgpt"],
  chatgpt: ["gpt"],
  image: ["img", "picture", "photo"],
  img: ["image"],
  picture: ["image"],
  photo: ["image"],
  js: ["javascript"],
  javascript: ["js"],
  ts: ["typescript"],
  typescript: ["ts"],
  py: ["python"],
  python: ["py"],
  ai: ["llm"],
  llm: ["ai"],
  email: ["mail"],
  mail: ["email"],
  k8s: ["kubernetes"],
  kubernetes: ["k8s"],
  seo: ["search engine"],
  // Prompt-domain intent synonyms — so "roughly the same" intent finds a prompt
  // even when the exact word differs (e.g. "summarize" finds a "Summary" prompt).
  summarize: ["summary", "tldr", "recap"],
  summary: ["summarize", "tldr"],
  tldr: ["summary", "summarize"],
  recap: ["summary", "summarize"],
  translate: ["translation", "translator"],
  translation: ["translate"],
  translator: ["translate"],
  debug: ["fix", "troubleshoot", "bug"],
  fix: ["debug", "bug"],
  bug: ["debug", "fix"],
  troubleshoot: ["debug", "fix"],
  code: ["coding", "program", "developer"],
  coding: ["code", "program"],
  program: ["code", "coding"],
  programming: ["code", "coding"],
  developer: ["code", "coding", "dev"],
  dev: ["developer"],
  essay: ["article", "blog"],
  article: ["essay", "blog", "post"],
  blog: ["article", "post"],
  post: ["blog", "article"],
  resume: ["cv"],
  cv: ["resume"],
  marketing: ["ad", "ads", "advertising", "copywriting"],
  ad: ["advertising", "marketing"],
  ads: ["advertising", "marketing"],
  advertising: ["marketing", "ads"],
  copywriting: ["marketing", "copy"],
  sql: ["database", "db"],
  database: ["sql", "db"],
  db: ["database", "sql"],
  story: ["fiction", "narrative"],
  fiction: ["story", "narrative"],
  narrative: ["story"],
  agent: ["assistant", "bot"],
  bot: ["assistant", "agent"],
  chatbot: ["assistant", "bot"],
};

// True when a and b are within Levenshtein distance 1 (one insert/delete/replace
// or one adjacent transposition). Cheap: early-exits on a length gap > 1.
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    const idx: number[] = [];
    for (let i = 0; i < la; i++) if (a[i] !== b[i]) { idx.push(i); if (idx.length > 2) return false; }
    if (idx.length <= 1) return true; // one substitution
    // one adjacent transposition
    return idx.length === 2 && idx[1] === idx[0] + 1 && a[idx[0]] === b[idx[1]] && a[idx[1]] === b[idx[0]];
  }
  // Lengths differ by 1 → allow one insert/delete.
  const [s, l] = la < lb ? [a, b] : [b, a];
  let i = 0, j = 0, skips = 0;
  while (i < s.length && j < l.length) {
    if (s[i] === l[j]) { i++; j++; }
    else { skips++; if (skips > 1) return false; j++; }
  }
  return true;
}

function words(s: string): string[] {
  return s.split(/[^a-z0-9]+/i).filter(Boolean);
}

export function scorePromptMatch(query: string, p: SearchablePrompt): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const name = (p.name || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  const tags = (p.tags || []).map((t) => t.toLowerCase());
  const nameWords = words(name);

  let score = 0;
  // Whole-query matches.
  if (name.includes(q)) score += 10;
  if (tags.some((t) => t.includes(q))) score += 5;
  if (desc.includes(q)) score += 2;

  // Exact + prefix bonuses on the name (strong relevance signals).
  if (name === q) score += 20;
  else if (name.startsWith(q)) score += 5;

  // Per-token matches (helps multi-word queries).
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (name.includes(token)) score += 3;
    if (nameWords.includes(token)) score += 2; // whole-word beats substring
    if (tags.some((t) => t === token)) score += 2;
    if (desc.includes(token)) score += 1;
    // Fuzzy: a single typo against a name word (only for tokens long enough to be safe).
    if (token.length >= 4 && !name.includes(token) && nameWords.some((w) => withinOneEdit(token, w))) {
      score += 2;
    }
    // Synonym credit: if the token itself didn't appear but a synonym does,
    // give a modest boost so e.g. "gpt" still finds a "ChatGPT" prompt.
    if (!name.includes(token) && !tags.some((t) => t.includes(token)) && !desc.includes(token)) {
      for (const syn of SYNONYMS[token] || []) {
        if (name.includes(syn) || tags.some((t) => t.includes(syn)) || desc.includes(syn)) {
          score += 2;
          break;
        }
      }
    }
  }
  return score;
}

// Score, drop non-matches, sort by score desc (stable for ties via original order).
export function rankBySearch<T extends SearchablePrompt>(query: string, prompts: T[]): T[] {
  return prompts
    .map((p, i) => ({ p, i, score: scorePromptMatch(query, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.p);
}
