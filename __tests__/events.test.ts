import {
  validateEvent,
  sanitizePath,
  sanitizeProps,
  isValidAnonId,
  aggregateEvents,
} from "../lib/events";

const ANON = "ab12cd34ef56";

describe("isValidAnonId", () => {
  it("accepts bounded alphanumeric ids only", () => {
    expect(isValidAnonId(ANON)).toBe(true);
    expect(isValidAnonId("short")).toBe(false);
    expect(isValidAnonId("has-dash-and-symbols!")).toBe(false);
    expect(isValidAnonId(12345678)).toBe(false);
  });
});

describe("sanitizePath", () => {
  it("strips query string and hash", () => {
    expect(sanitizePath("/browse?q=secret&token=abc#frag")).toBe("/browse");
  });
  it("forces a leading slash and caps length", () => {
    expect(sanitizePath("browse")).toBe("/browse");
    expect(sanitizePath("/" + "x".repeat(500))!.length).toBeLessThanOrEqual(256);
  });
  it("rejects paths that carry PII / sensitive tokens", () => {
    expect(sanitizePath("/Users/adrian/secret")).toBeNull();
    expect(sanitizePath("/u/someone@example.com")).toBeNull();
    expect(sanitizePath("")).toBeNull();
    expect(sanitizePath(42)).toBeNull();
  });
});

describe("sanitizeProps", () => {
  it("keeps primitive values with valid keys, bounded", () => {
    expect(sanitizeProps({ slug: "cold-email", count: 3, ok: true })).toEqual({
      slug: "cold-email",
      count: 3,
      ok: true,
    });
  });
  it("drops bad keys, PII string values, and caps key count", () => {
    expect(sanitizeProps({ "bad key": 1 })).toBeUndefined();
    expect(sanitizeProps({ email: "a@b.com" })).toBeUndefined(); // PII value dropped → empty → undefined
    const many: Record<string, number> = {};
    for (let i = 0; i < 20; i++) many["k" + i] = i;
    expect(Object.keys(sanitizeProps(many)!).length).toBeLessThanOrEqual(8);
  });
  it("returns undefined for non-objects/arrays", () => {
    expect(sanitizeProps(null)).toBeUndefined();
    expect(sanitizeProps([1, 2])).toBeUndefined();
  });
});

describe("validateEvent", () => {
  it("accepts a good event and stamps server ts", () => {
    const r = validateEvent({ type: "page_view", path: "/browse?x=1", anonId: ANON }, 1000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.event).toEqual({ type: "page_view", path: "/browse", ts: 1000, anonId: ANON });
    }
  });
  it("rejects unknown types, bad paths, bad anonIds", () => {
    expect(validateEvent({ type: "evil", path: "/x", anonId: ANON }).ok).toBe(false);
    expect(validateEvent({ type: "page_view", path: "/Users/x", anonId: ANON }).ok).toBe(false);
    expect(validateEvent({ type: "page_view", path: "/x", anonId: "no" }).ok).toBe(false);
    expect(validateEvent("nope").ok).toBe(false);
  });
  it("ignores a client-supplied ts in favor of the server clock", () => {
    const r = validateEvent({ type: "search", path: "/browse", anonId: ANON, ts: 9999999 }, 42);
    expect(r.ok && r.event.ts).toBe(42);
  });
});

describe("aggregateEvents", () => {
  it("counts by type, ranks top paths, and counts unique visitors", () => {
    const agg = aggregateEvents([
      { type: "page_view", path: "/a", anonId: "u1" },
      { type: "page_view", path: "/a", anonId: "u2" },
      { type: "page_view", path: "/b", anonId: "u1" },
      { type: "prompt_copy", path: "/a", anonId: "u1" },
    ]);
    expect(agg.total).toBe(4);
    expect(agg.byType).toEqual({ page_view: 3, prompt_copy: 1 });
    expect(agg.topPaths[0]).toEqual({ path: "/a", count: 3 });
    expect(agg.uniqueVisitors).toBe(2);
  });
});
