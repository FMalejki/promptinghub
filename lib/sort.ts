// Canonical sort handling for the prompt list. Pure + dependency-free so it can
// be unit-tested and shared by both the API route and lib/prompts.ts. Previously
// the route accepted only a few literals and any other value (e.g. "top",
// "trending") silently fell back to "recent" — a no-op the persona QA caught.
// resolveSort() now maps common aliases onto real keys instead of dropping them.

export const SORT_KEYS = ["recent", "popular", "copied", "trending", "viewed"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

// Friendly aliases → canonical key, so URLs like ?sort=top or ?sort=hot rank.
const ALIASES: Record<string, SortKey> = {
  top: "popular",
  best: "popular",
  stars: "popular",
  starred: "popular",
  new: "recent",
  newest: "recent",
  latest: "recent",
  hot: "trending",
  copies: "copied",
  mostcopied: "copied",
  views: "viewed",
  mostviewed: "viewed",
};

/** Normalize any raw sort input to a valid SortKey (defaults to "recent"). */
export function resolveSort(input: unknown): SortKey {
  if (typeof input !== "string") return "recent";
  const k = input.trim().toLowerCase();
  if ((SORT_KEYS as readonly string[]).includes(k)) return k as SortKey;
  return ALIASES[k] ?? "recent";
}

export type SortSpec = Record<string, 1 | -1>;

/** Mongo $sort spec for a canonical SortKey. createdAt breaks ties consistently. */
export function sortSpec(sort: SortKey): SortSpec {
  switch (sort) {
    case "popular":
      return { stars: -1, createdAt: -1 };
    case "copied":
      return { copyCount: -1, createdAt: -1 };
    case "trending":
      return { trendingScore: -1, createdAt: -1 };
    case "viewed":
      return { viewCount: -1, createdAt: -1 };
    case "recent":
    default:
      return { createdAt: -1, _id: -1 };
  }
}
