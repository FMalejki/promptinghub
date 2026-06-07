// Pure relevance scoring for prompt search. Weights matches by field:
// name > tags > description, with both full-query and per-token credit.

export type SearchablePrompt = { id: string; name: string; description?: string; tags?: string[] };

export function scorePromptMatch(query: string, p: SearchablePrompt): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const name = (p.name || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  const tags = (p.tags || []).map((t) => t.toLowerCase());

  let score = 0;
  // Whole-query matches.
  if (name.includes(q)) score += 10;
  if (tags.some((t) => t.includes(q))) score += 5;
  if (desc.includes(q)) score += 2;

  // Per-token matches (helps multi-word queries).
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (name.includes(token)) score += 3;
    if (tags.some((t) => t === token)) score += 2;
    if (desc.includes(token)) score += 1;
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
