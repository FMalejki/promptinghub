import { trendingBadge, trendingRankMap, TRENDING_BADGE_TOP_N } from "../lib/trendingBadge";

describe("trendingBadge", () => {
  it("gives the top 3 a ranked badge", () => {
    expect(trendingBadge(1)).toEqual({ label: "#1 Trending", rank: 1, top3: true });
    expect(trendingBadge(3)).toEqual({ label: "#3 Trending", rank: 3, top3: true });
  });
  it("gives ranks 4..N a plain Trending badge", () => {
    expect(trendingBadge(4)).toEqual({ label: "Trending", rank: 4, top3: false });
    expect(trendingBadge(TRENDING_BADGE_TOP_N)).toEqual({ label: "Trending", rank: TRENDING_BADGE_TOP_N, top3: false });
  });
  it("returns null outside the badged window or for bad input", () => {
    expect(trendingBadge(TRENDING_BADGE_TOP_N + 1)).toBeNull();
    expect(trendingBadge(0)).toBeNull();
    expect(trendingBadge(-2)).toBeNull();
    expect(trendingBadge(null)).toBeNull();
    expect(trendingBadge(undefined)).toBeNull();
    expect(trendingBadge(2.5)).toBeNull();
  });
});

describe("trendingRankMap", () => {
  it("maps ordered ids to 1-based ranks", () => {
    const m = trendingRankMap(["a", "b", "c"]);
    expect(m.get("a")).toBe(1);
    expect(m.get("b")).toBe(2);
    expect(m.get("c")).toBe(3);
    expect(m.has("z")).toBe(false);
  });
  it("keeps the first rank on duplicate ids and skips falsy ids", () => {
    const m = trendingRankMap(["a", "a", "", "b"]);
    expect(m.get("a")).toBe(1); // not overwritten by the later duplicate
    expect(m.get("b")).toBe(4);
    expect(m.has("")).toBe(false);
  });
});
