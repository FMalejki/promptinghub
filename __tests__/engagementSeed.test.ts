import { engagementFor, personaEmailSet, nonPersonaHandledSet, type SeedUser } from "../lib/engagementSeed";

const POOL = ["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com", "f@x.com", "g@x.com", "h@x.com"];

const isJunk = (e: string) => /(^|[+_-])(uxbot|rltest|sectest|ratetest)|wierzba@/i.test(e);

const USERS: SeedUser[] = [
  { email: "curated@promptinghub.app", handle: "curated", hasPassword: false }, // persona
  { email: "ava@gmail.com", handle: "ava", hasPassword: false }, // persona (gmail but seed)
  { email: "alice@example.com", handle: "alice", hasPassword: true }, // real signup → NOT persona
  { email: "filipmalejki@gmail.com", handle: "filipmalejki", hasPassword: true }, // real → NOT persona
  { email: "uxbot+1@example.com", handle: "uxbot-1", hasPassword: true }, // junk
  { email: "nohandle@gmail.com", handle: null, hasPassword: false }, // no handle → not persona
];

describe("personaEmailSet", () => {
  it("includes only passwordless, handled, non-junk accounts", () => {
    const s = personaEmailSet(USERS, isJunk);
    expect([...s].sort()).toEqual(["ava@gmail.com", "curated@promptinghub.app"]);
  });
  it("excludes real signups even when they have a handle", () => {
    const s = personaEmailSet(USERS, isJunk);
    expect(s.has("alice@example.com")).toBe(false);
    expect(s.has("filipmalejki@gmail.com")).toBe(false);
  });
});

describe("nonPersonaHandledSet", () => {
  it("captures real/test accounts that have a handle but aren't personas", () => {
    const s = nonPersonaHandledSet(USERS, isJunk);
    expect(s.has("alice@example.com")).toBe(true);
    expect(s.has("filipmalejki@gmail.com")).toBe(true);
    expect(s.has("uxbot+1@example.com")).toBe(true);
  });
  it("does not include personas or handleless accounts", () => {
    const s = nonPersonaHandledSet(USERS, isJunk);
    expect(s.has("curated@promptinghub.app")).toBe(false);
    expect(s.has("nohandle@gmail.com")).toBe(false);
  });
});

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
