import { rankTrending, trendingScore } from "../lib/trending";

const NOW = 1_000_000_000_000; // fixed clock
const hoursAgo = (h: number) => NOW - h * 60 * 60 * 1000;
const daysAgo = (d: number) => NOW - d * 24 * 60 * 60 * 1000;

describe("rankTrending", () => {
  it("ranks higher engagement first when signal is sufficient", () => {
    const out = rankTrending(
      [
        { id: "low", copyCount: 1, stars: 0, createdAt: hoursAgo(5) },
        { id: "high", copyCount: 10, stars: 5, createdAt: hoursAgo(5) },
      ],
      { now: NOW },
    );
    expect(out.mode).toBe("trending");
    expect(out.prompts[0].id).toBe("high");
  });

  it("decays by recency — newer wins on equal raw engagement", () => {
    const out = rankTrending(
      [
        { id: "old", copyCount: 6, stars: 0, createdAt: daysAgo(20) },
        { id: "new", copyCount: 6, stars: 0, createdAt: hoursAgo(2) },
      ],
      { now: NOW },
    );
    expect(out.prompts[0].id).toBe("new");
    expect(trendingScore({ id: "n", copyCount: 6, createdAt: hoursAgo(2) }, NOW)).toBeGreaterThan(
      trendingScore({ id: "o", copyCount: 6, createdAt: daysAgo(20) }, NOW),
    );
  });

  it("filters by window (24h excludes older prompts)", () => {
    const out = rankTrending(
      [
        { id: "fresh", copyCount: 5, stars: 0, createdAt: hoursAgo(3) },
        { id: "stale", copyCount: 99, stars: 0, createdAt: daysAgo(10) },
      ],
      { now: NOW, window: "24h" },
    );
    expect(out.prompts.map((p) => p.id)).toEqual(["fresh"]);
  });

  it("falls back to newest-first ('recent') when total signal is below threshold", () => {
    const out = rankTrending(
      [
        { id: "a", copyCount: 0, stars: 0, createdAt: daysAgo(2) },
        { id: "b", copyCount: 1, stars: 0, createdAt: daysAgo(1) },
        { id: "c", copyCount: 0, stars: 1, createdAt: daysAgo(5) },
      ],
      { now: NOW, minSignal: 5 },
    );
    expect(out.mode).toBe("recent");
    expect(out.prompts.map((p) => p.id)).toEqual(["b", "a", "c"]); // newest-first
  });

  it("treats the 'all' window as no time filter", () => {
    const out = rankTrending(
      [{ id: "old", copyCount: 50, stars: 10, createdAt: daysAgo(100) }],
      { now: NOW, window: "all" },
    );
    expect(out.prompts).toHaveLength(1);
  });
});
