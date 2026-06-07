import { nameTokens, similarityScore, rankSimilar } from "../lib/similar";

describe("nameTokens", () => {
  it("normalizes to a lowercased de-duped word set, dropping punctuation", () => {
    expect([...nameTokens("Cold Email Generator!!")]).toEqual(["cold", "email", "generator"]);
    expect([...nameTokens("SEO  seo - SEO")]).toEqual(["seo"]);
  });
});

describe("similarityScore", () => {
  it("is 1 for identical, 0 for disjoint, in-between for overlap (Jaccard)", () => {
    expect(similarityScore("cold email", "cold email")).toBe(1);
    expect(similarityScore("cold email", "warm coffee")).toBe(0);
    // {cold,email,generator} vs {cold,email}: 2 shared / 3 union
    expect(similarityScore("cold email generator", "cold email")).toBeCloseTo(2 / 3, 5);
  });
});

describe("rankSimilar", () => {
  const items = [
    { id: "1", name: "Cold email generator" },
    { id: "2", name: "Cold outreach email" },
    { id: "3", name: "Recipe writer" },
  ];

  it("returns matches above threshold, sorted by score desc", () => {
    const out = rankSimilar("cold email", items, { threshold: 0.3, limit: 5 });
    expect(out.map((m) => m.id)).toEqual(["1", "2"]);
    expect(out[0].score).toBeGreaterThanOrEqual(out[1].score);
  });

  it("respects the limit and excludes an optional id", () => {
    expect(rankSimilar("cold email", items, { threshold: 0.1, limit: 1 })).toHaveLength(1);
    const out = rankSimilar("cold email", items, { threshold: 0.3, limit: 5, excludeId: "1" });
    expect(out.map((m) => m.id)).toEqual(["2"]);
  });
});
