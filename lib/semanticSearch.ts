// Hybrid search ranking: blend keyword relevance (lib/search) with semantic
// (embedding cosine) similarity, so a query finds prompts that MEAN the same
// thing even when they share no words — while exact keyword hits still rank at
// the top. Pure + unit-testable: the caller supplies the query embedding and a
// per-prompt embedding lookup, so no model runs here.

import { scorePromptMatch, type SearchablePrompt } from "./search";
import { cosineSimilarity } from "./embeddings";

export type SemanticConfig = {
  semWeight: number; // points a strong cosine adds, comparable to keyword weights
  floor: number; // min cosine for a semantic-ONLY (no keyword) result to qualify
  threshold: number; // cosine at/below this contributes nothing (noise gate)
};

// Tuned against MiniLM all-MiniLM-L6-v2 score ranges (related sentences ~0.3-0.6,
// unrelated ~0.0-0.15). floor 0.35 keeps semantic-only hits genuinely on-topic.
export const DEFAULT_SEMANTIC: SemanticConfig = { semWeight: 25, floor: 0.35, threshold: 0.2 };

export type SemanticRanked<T> = { item: T; keyword: number; cosine: number; score: number };

// Core scorer (exposed for tests): returns every qualifying prompt with its
// keyword/cosine/combined scores, already sorted best-first.
export function scoreHybrid<T extends SearchablePrompt>(
  query: string,
  prompts: T[],
  queryEmbedding: number[] | null,
  embeddingById: Map<string, number[]>,
  cfg: SemanticConfig = DEFAULT_SEMANTIC,
): SemanticRanked<T>[] {
  return prompts
    .map((p, i) => {
      const keyword = scorePromptMatch(query, p);
      let cosine = 0;
      if (queryEmbedding) {
        const emb = embeddingById.get(p.id);
        if (emb) cosine = cosineSimilarity(queryEmbedding, emb);
      }
      const semantic = cosine > cfg.threshold ? cfg.semWeight * (cosine - cfg.threshold) : 0;
      const qualifies = keyword > 0 || cosine >= cfg.floor;
      return { item: p, i, keyword, cosine, score: keyword + semantic, qualifies };
    })
    .filter((x) => x.qualifies)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ item, keyword, cosine, score }) => ({ item, keyword, cosine, score }));
}

// Convenience wrapper matching rankBySearch's shape (returns just the prompts).
// When queryEmbedding is null (model unavailable) this collapses to pure keyword
// ranking — identical behavior to rankBySearch, so search never regresses.
export function hybridRank<T extends SearchablePrompt>(
  query: string,
  prompts: T[],
  queryEmbedding: number[] | null,
  embeddingById: Map<string, number[]>,
  cfg: SemanticConfig = DEFAULT_SEMANTIC,
): T[] {
  return scoreHybrid(query, prompts, queryEmbedding, embeddingById, cfg).map((x) => x.item);
}
