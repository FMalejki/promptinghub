import { pickReadme, parseBlocks, parseInline } from "../lib/markdown";

describe("pickReadme", () => {
  it("finds a README.md regardless of case or folder", () => {
    expect(pickReadme([{ path: "prompt.txt", content: "x" }, { path: "README.md", content: "hi" }])).toBe("hi");
    expect(pickReadme([{ path: "docs/Readme.MD", content: "yo" }])).toBe("yo");
  });
  it("returns null when no readme present", () => {
    expect(pickReadme([{ path: "prompt.txt", content: "x" }])).toBeNull();
    expect(pickReadme([])).toBeNull();
  });
  it("ignores a readme with empty content", () => {
    expect(pickReadme([{ path: "README.md", content: "   " }])).toBeNull();
  });
});

describe("parseBlocks", () => {
  it("parses headings with levels", () => {
    const b = parseBlocks("# Title\n## Sub");
    expect(b[0]).toEqual({ type: "heading", level: 1, text: "Title" });
    expect(b[1]).toEqual({ type: "heading", level: 2, text: "Sub" });
  });
  it("parses fenced code blocks with language", () => {
    const b = parseBlocks("```python\nprint(1)\n```");
    expect(b[0]).toEqual({ type: "code", lang: "python", text: "print(1)" });
  });
  it("groups consecutive bullet lines into one list", () => {
    const b = parseBlocks("- a\n- b\n- c");
    expect(b[0]).toEqual({ type: "list", items: ["a", "b", "c"] });
  });
  it("treats blank-line-separated text as paragraphs", () => {
    const b = parseBlocks("hello world\n\nsecond para");
    expect(b).toEqual([
      { type: "paragraph", text: "hello world" },
      { type: "paragraph", text: "second para" },
    ]);
  });
});

describe("parseInline", () => {
  it("splits bold, italic and inline code", () => {
    expect(parseInline("a **b** c")).toEqual([
      { type: "text", text: "a " },
      { type: "bold", text: "b" },
      { type: "text", text: " c" },
    ]);
    expect(parseInline("`code`")).toEqual([{ type: "code", text: "code" }]);
  });
  it("parses links and rejects non-http hrefs", () => {
    expect(parseInline("see [docs](https://x.com)")).toEqual([
      { type: "text", text: "see " },
      { type: "link", text: "docs", href: "https://x.com" },
    ]);
    // javascript: scheme must be neutralized — no link segment, original text preserved
    const segs = parseInline("[x](javascript:alert(1))");
    expect(segs.some((s) => s.type === "link")).toBe(false);
    expect(segs.map((s) => s.text).join("")).toBe("[x](javascript:alert(1))");
  });
});
