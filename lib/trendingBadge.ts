// Pure helper for the "trending" badge shown on prompt cards in /browse. A card
// gets a flame badge when its prompt currently sits in the top N of the trending
// ranking (engagement with time-decay). The top 3 get a stronger, ranked badge
// ("#2 Trending"); 4–N get a plain "Trending". Kept pure so the rank→badge
// decision is unit-testable without rendering a card.

// How deep the trending badge reaches. Owner spec: "top 3 albo 10".
export const TRENDING_BADGE_TOP_N = 10;

export type TrendingBadge = { label: string; rank: number; top3: boolean };

/**
 * Badge descriptor for a 1-based trending rank, or null when the prompt isn't in
 * the badged window (rank missing, ≤0, or beyond TRENDING_BADGE_TOP_N).
 */
export function trendingBadge(rank: number | null | undefined): TrendingBadge | null {
  if (typeof rank !== "number" || !Number.isInteger(rank) || rank < 1 || rank > TRENDING_BADGE_TOP_N) {
    return null;
  }
  const top3 = rank <= 3;
  return { label: top3 ? `#${rank} Trending` : "Trending", rank, top3 };
}

/** Build a path→rank (1-based) map from an ordered list of trending prompt ids. */
export function trendingRankMap(orderedIds: string[]): Map<string, number> {
  const m = new Map<string, number>();
  orderedIds.forEach((id, i) => {
    if (id && !m.has(id)) m.set(id, i + 1);
  });
  return m;
}
