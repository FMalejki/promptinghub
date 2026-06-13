import { countMatches, splitHighlight, searchFiles, MIN_QUERY_LEN } from "../lib/promptSearch";

describe("countMatches", () => {
  it("counts case-insensitive, non-overlapping occurrences", () => {
    expect(countMatches("Foo foo FOO bar", "foo")).toBe(3);
    expect(countMatches("aaaa", "aa")).toBe(2); // non-overlapping
  });
  it("ignores queries below the minimum length", () => {
    expect(countMatches("aaaa", "a")).toBe(0);
    expect(MIN_QUERY_LEN).toBe(2);
  });
  it("is 0 for no match or empty text", () => {
    expect(countMatches("hello world", "xyz")).toBe(0);
    expect(countMatches("", "foo")).toBe(0);
  });
});

describe("splitHighlight", () => {
  it("splits into alternating match / non-match segments", () => {
    const segs = splitHighlight("a foo b foo", "foo");
    expect(segs).toEqual([
      { text: "a ", match: false },
      { text: "foo", match: true },
      { text: " b ", match: false },
      { text: "foo", match: true },
    ]);
  });
  it("preserves the original casing of each matched span", () => {
    const segs = splitHighlight("FoO bar", "foo");
    expect(segs[0]).toEqual({ text: "FoO", match: true });
  });
  it("returns the whole text as one plain segment when nothing matches", () => {
    expect(splitHighlight("hello", "zzz")).toEqual([{ text: "hello", match: false }]);
  });
  it("caps the number of highlighted matches and keeps the rest as plain text", () => {
    const segs = splitHighlight("xxxxxx", "x", 2); // query len 1 < MIN, so no highlight
    expect(segs).toEqual([{ text: "xxxxxx", match: false }]);
    const capped = splitHighlight("ababab", "ab", 2);
    const marks = capped.filter((s) => s.match).length;
    expect(marks).toBe(2); // only 2 of the 3 "ab" get highlighted
    expect(capped.map((s) => s.text).join("")).toBe("ababab"); // text preserved
  });
});

describe("searchFiles", () => {
  const files = [
    { path: "a.txt", content: "alpha beta alpha" },
    { path: "b.txt", content: "gamma" },
    { path: "dir/c.md", content: "alpha" },
  ];
  it("returns per-file counts only for files that match, plus totals", () => {
    const r = searchFiles(files, "alpha");
    expect(r.counts).toEqual({ "a.txt": 2, "dir/c.md": 1 });
    expect(r.total).toBe(3);
    expect(r.filesWithMatches).toBe(2);
  });
  it("is empty for a sub-minimum query", () => {
    const r = searchFiles(files, "a");
    expect(r.total).toBe(0);
    expect(r.filesWithMatches).toBe(0);
    expect(r.counts).toEqual({});
  });
});
