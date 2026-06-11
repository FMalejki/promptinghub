import { resolveSort, sortSpec, SORT_KEYS } from "../lib/sort";

describe("resolveSort", () => {
  it("passes through every canonical key", () => {
    for (const k of SORT_KEYS) expect(resolveSort(k)).toBe(k);
  });

  it("maps aliases onto real keys (no silent no-op)", () => {
    expect(resolveSort("top")).toBe("popular");
    expect(resolveSort("best")).toBe("popular");
    expect(resolveSort("hot")).toBe("trending");
    expect(resolveSort("newest")).toBe("recent");
    expect(resolveSort("mostcopied")).toBe("copied");
    expect(resolveSort("mostviewed")).toBe("viewed");
  });

  it("is case-insensitive and trims", () => {
    expect(resolveSort("  Popular ")).toBe("popular");
    expect(resolveSort("TOP")).toBe("popular");
  });

  it("defaults unknown / non-string input to recent", () => {
    expect(resolveSort("garbage")).toBe("recent");
    expect(resolveSort(undefined)).toBe("recent");
    expect(resolveSort(123)).toBe("recent");
    expect(resolveSort("")).toBe("recent");
  });
});

describe("sortSpec", () => {
  it("ranks popular by stars, not creation date alone", () => {
    expect(sortSpec("popular")).toEqual({ stars: -1, createdAt: -1 });
  });
  it("ranks copied/trending/viewed by their counters", () => {
    expect(sortSpec("copied")).toEqual({ copyCount: -1, createdAt: -1 });
    expect(sortSpec("trending")).toEqual({ trendingScore: -1, createdAt: -1 });
    expect(sortSpec("viewed")).toEqual({ viewCount: -1, createdAt: -1 });
  });
  it("recent falls back to createdAt + _id", () => {
    expect(sortSpec("recent")).toEqual({ createdAt: -1, _id: -1 });
  });
  it("composes with resolveSort so an alias actually ranks", () => {
    expect(sortSpec(resolveSort("top"))).toEqual({ stars: -1, createdAt: -1 });
  });
});
