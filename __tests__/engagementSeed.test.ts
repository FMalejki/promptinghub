import { engagementFor } from "../lib/engagementSeed";

const POOL = ["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com", "f@x.com", "g@x.com", "h@x.com"];

describe("engagementFor", () => {
  it("is deterministic — same prompt id yields identical engagement", () => {
    const a = engagementFor("prompt-123", POOL);
    const b = engagementFor("prompt-123", POOL);
    expect(a).toEqual(b);
  });

  it("varies across prompt ids", () => {
    const results = ["p1", "p2", "p3", "p4", "p5", "p6"].map((id) => engagementFor(id, POOL).starrers.length);
    expect(new Set(results).size).toBeGreaterThan(1);
  });

  it("never exceeds the pool or maxStars, and starrers are unique + from the pool", () => {
    for (const id of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]) {
      const { starrers } = engagementFor(id, POOL, { maxStars: 5 });
      expect(starrers.length).toBeLessThanOrEqual(5);
      expect(new Set(starrers).size).toBe(starrers.length);
      for (const s of starrers) expect(POOL).toContain(s);
    }
  });

  it("returns empty for an empty persona pool", () => {
    expect(engagementFor("x", [])).toEqual({ starrers: [], copies: 0 });
  });

  it("copies are >= star count when there are stars", () => {
    for (const id of ["k", "l", "m", "n", "o", "p", "q"]) {
      const e = engagementFor(id, POOL);
      if (e.starrers.length > 0) expect(e.copies).toBeGreaterThanOrEqual(e.starrers.length);
    }
  });

  it("produces a long tail — most prompts modest, some richer", () => {
    const counts = Array.from({ length: 60 }, (_, i) => engagementFor("seed-" + i, POOL).starrers.length);
    const max = Math.max(...counts);
    const avg = counts.reduce((s, n) => s + n, 0) / counts.length;
    expect(max).toBeGreaterThan(avg); // skewed, not flat
    expect(avg).toBeLessThan(POOL.length); // not everyone stars everything
  });
});
