import { diffLines, diffStats } from "../lib/diff";

describe("diffLines", () => {
  it("marks identical text as all context", () => {
    const segs = diffLines("a\nb\nc", "a\nb\nc");
    expect(segs).toEqual([
      { type: "ctx", text: "a" },
      { type: "ctx", text: "b" },
      { type: "ctx", text: "c" },
    ]);
  });

  it("detects a pure addition", () => {
    const segs = diffLines("a\nb", "a\nb\nc");
    expect(segs).toEqual([
      { type: "ctx", text: "a" },
      { type: "ctx", text: "b" },
      { type: "add", text: "c" },
    ]);
  });

  it("detects a pure deletion", () => {
    const segs = diffLines("a\nb\nc", "a\nc");
    expect(segs).toEqual([
      { type: "ctx", text: "a" },
      { type: "del", text: "b" },
      { type: "ctx", text: "c" },
    ]);
  });

  it("represents a replacement as a deletion followed by an addition", () => {
    const segs = diffLines("hello world", "hello there");
    expect(segs).toEqual([
      { type: "del", text: "hello world" },
      { type: "add", text: "hello there" },
    ]);
  });

  it("handles an empty old side (all added) and empty new side (all removed)", () => {
    expect(diffLines("", "x")).toEqual([{ type: "add", text: "x" }]);
    expect(diffLines("x", "")).toEqual([{ type: "del", text: "x" }]);
    expect(diffLines("", "")).toEqual([{ type: "ctx", text: "" }]);
  });
});

describe("diffStats", () => {
  it("counts additions and removals", () => {
    expect(diffStats("a\nb\nc", "a\nx\nc\nd")).toEqual({ added: 2, removed: 1 });
    expect(diffStats("a\nb", "a\nb")).toEqual({ added: 0, removed: 0 });
  });
});
