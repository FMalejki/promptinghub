// Pure name-similarity helpers for the "this looks like an existing prompt"
// warning on the create form. Token Jaccard — cheap and dependency-free.

export function nameTokens(name: string): Set<string> {
  const words = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return new Set(words);
}

export function similarityScore(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const union = ta.size + tb.size - shared;
  return union === 0 ? 0 : shared / union;
}

export type SimilarItem = { id: string; name: string };
export type RankedItem = SimilarItem & { score: number };
export type RankOpts = { threshold?: number; limit?: number; excludeId?: string };

export function rankSimilar(query: string, items: SimilarItem[], opts: RankOpts = {}): RankedItem[] {
  const threshold = opts.threshold ?? 0.34;
  const limit = opts.limit ?? 5;
  return items
    .filter((it) => it.id !== opts.excludeId)
    .map((it) => ({ ...it, score: similarityScore(query, it.name) }))
    .filter((it) => it.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
