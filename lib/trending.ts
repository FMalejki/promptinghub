// Pure trending ranking. Kept pure (takes `now` explicitly, no Date.now) so it's
// testable and can run on the client. The Trending page fetches a pool of prompts
// and ranks them here per the selected time window.
//
// Honesty: when the total engagement signal in the window is tiny (the platform is
// young), ranking by copies+stars is just noise — so we fall back to "Recently
// added" (newest-first) and tell the user.

export type RankablePrompt = {
  id: string;
  copyCount?: number;
  stars?: number;
  createdAt: string | number | Date;
};

export type TrendWindow = "24h" | "7d" | "all";
export type RankMode = "trending" | "recent";
export type RankResult<T> = { prompts: T[]; mode: RankMode };

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_MS: Record<TrendWindow, number | null> = { "24h": DAY, "7d": 7 * DAY, all: null };

function ms(d: string | number | Date): number {
  return d instanceof Date ? d.getTime() : new Date(d).getTime();
}

// Engagement with a gravity decay by age, so a fresh prompt with the same
// copies+stars outranks a stale one (Hacker-News-style). Stars weigh a touch more
// than copies.
export function trendingScore(p: RankablePrompt, now: number): number {
  const engagement = (p.copyCount || 0) + (p.stars || 0) * 2;
  if (engagement <= 0) return 0;
  const ageHours = Math.max(0, now - ms(p.createdAt)) / (60 * 60 * 1000);
  return engagement / Math.pow(ageHours + 2, 0.5);
}

export function rankTrending<T extends RankablePrompt>(
  prompts: T[],
  opts: { now: number; window?: TrendWindow; minSignal?: number },
): RankResult<T> {
  const window = opts.window ?? "all";
  const minSignal = opts.minSignal ?? 3;
  const win = WINDOW_MS[window];

  const candidates = win == null ? [...prompts] : prompts.filter((p) => opts.now - ms(p.createdAt) <= win);
  const totalSignal = candidates.reduce((s, p) => s + (p.copyCount || 0) + (p.stars || 0), 0);

  if (totalSignal < minSignal) {
    return { prompts: candidates.sort((a, b) => ms(b.createdAt) - ms(a.createdAt)), mode: "recent" };
  }
  return {
    prompts: candidates.sort(
      (a, b) => trendingScore(b, opts.now) - trendingScore(a, opts.now) || ms(b.createdAt) - ms(a.createdAt),
    ),
    mode: "trending",
  };
}
