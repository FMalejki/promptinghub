import { sortRoots, type SortableComment } from "../lib/commentSort";

const c = (id: string, createdAt: string, likeCount = 0): SortableComment => ({
  id,
  parentId: null,
  createdAt,
  likeCount,
});

describe("sortRoots", () => {
  const roots = [
    c("a", "2026-06-01T00:00:00Z", 2),
    c("b", "2026-06-03T00:00:00Z", 5),
    c("c", "2026-06-02T00:00:00Z", 5),
  ];

  it("newest sorts by createdAt descending", () => {
    expect(sortRoots(roots, "newest").map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("top sorts by likeCount descending, breaking ties by newest", () => {
    // b and c both have 5 likes; b is newer so it comes first
    expect(sortRoots(roots, "top").map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("top puts the most-liked first even if older", () => {
    const r = [c("old", "2026-01-01T00:00:00Z", 10), c("new", "2026-12-01T00:00:00Z", 1)];
    expect(sortRoots(r, "top").map((x) => x.id)).toEqual(["old", "new"]);
  });

  it("does not mutate the input array", () => {
    const input = [...roots];
    sortRoots(input, "top");
    expect(input.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("treats a missing likeCount as zero", () => {
    const r = [{ id: "x", parentId: null, createdAt: "2026-06-01T00:00:00Z" }, c("y", "2026-06-02T00:00:00Z", 1)];
    expect(sortRoots(r, "top").map((x) => x.id)).toEqual(["y", "x"]);
  });
});
