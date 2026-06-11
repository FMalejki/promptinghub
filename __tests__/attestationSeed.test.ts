import { attestationsFor, FALLBACK_MODELS } from "../lib/attestationSeed";

const POOL = ["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com", "f@x.com", "g@x.com", "h@x.com"];

describe("attestationsFor", () => {
  it("is deterministic — same inputs yield identical output", () => {
    const a = attestationsFor("p1", ["gpt-4o", "claude-3.5-sonnet"], POOL);
    const b = attestationsFor("p1", ["gpt-4o", "claude-3.5-sonnet"], POOL);
    expect(a).toEqual(b);
  });

  it("returns [] for an empty persona pool", () => {
    expect(attestationsFor("p1", ["gpt-4o"], [])).toEqual([]);
  });

  it("only votes on real models (skips 'other'/empty) and uses fallback when none real", () => {
    const none = attestationsFor("seed-xyz", ["other", ""], POOL);
    for (const a of none) expect(FALLBACK_MODELS).toContain(a.modelId);
  });

  it("votes only from the pool, one (model,email) per row, capped per model", () => {
    const rows = attestationsFor("p2", ["gpt-4o"], POOL, { maxPerModel: 4, maxModels: 1 });
    const seen = new Set<string>();
    for (const r of rows) {
      expect(POOL).toContain(r.email);
      const key = r.modelId + "|" + r.email;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    const perModel = rows.filter((r) => r.modelId === "gpt-4o").length;
    expect(perModel).toBeLessThanOrEqual(4);
  });

  it("caps the number of distinct models voted on", () => {
    const rows = attestationsFor("p3", ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash", "o3-mini"], POOL, { maxModels: 2 });
    expect(new Set(rows.map((r) => r.modelId)).size).toBeLessThanOrEqual(2);
  });

  it("produces a realistic mix — mostly works, with some mixed/broken across many prompts", () => {
    const counts: Record<string, number> = { works: 0, mixed: 0, broken: 0 };
    for (let i = 0; i < 80; i++) {
      for (const a of attestationsFor("seed-" + i, ["gpt-4o", "claude-3.5-sonnet"], POOL)) counts[a.vote]++;
    }
    expect(counts.works).toBeGreaterThan(counts.mixed); // works dominates
    expect(counts.mixed).toBeGreaterThan(0); // but not all-works
    expect(counts.works + counts.mixed + counts.broken).toBeGreaterThan(0);
  });
});
