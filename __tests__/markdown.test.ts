import { pickReadme, resolveReadme, parseBlocks, parseInline } from "../lib/markdown";

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
  it("prefers the ROOT readme over a nested one, regardless of array order", () => {
    expect(
      pickReadme([
        { path: "phases/README.md", content: "# Phase files" },
        { path: "README.md", content: "# Root" },
      ]),
    ).toBe("# Root");
    // root listed second-deepest still wins
    expect(
      pickReadme([
        { path: "a/b/readme.md", content: "deep" },
        { path: "docs/README.md", content: "docs" },
        { path: "README", content: "root-noext" },
      ]),
    ).toBe("root-noext");
  });
});

describe("resolveReadme", () => {
  const files = [{ path: "prompt.txt", content: "p" }, { path: "README.md", content: "from file" }];
  it("prefers the explicit readme field over a README file", () => {
    expect(resolveReadme("explicit readme", files)).toBe("explicit readme");
  });
  it("falls back to a README file when the explicit field is empty/blank/absent", () => {
    expect(resolveReadme("", files)).toBe("from file");
    expect(resolveReadme("   ", files)).toBe("from file");
    expect(resolveReadme(null, files)).toBe("from file");
    expect(resolveReadme(undefined, files)).toBe("from file");
  });
  it("returns null when neither has content", () => {
    expect(resolveReadme("", [{ path: "prompt.txt", content: "p" }])).toBeNull();
    expect(resolveReadme(null, [])).toBeNull();
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
  it("keeps bullet lists in their original shape (no ordered key)", () => {
    expect(parseBlocks("- a\n- b")).toEqual([{ type: "list", items: ["a", "b"] }]);
  });
  it("parses ordered (numbered) lists with an ordered flag", () => {
    expect(parseBlocks("1. first\n2. second\n3. third")).toEqual([
      { type: "list", ordered: true, items: ["first", "second", "third"] },
    ]);
  });
  it("splits an ordered list and a following bullet list into two blocks", () => {
    const b = parseBlocks("1. one\n2. two\n\n- a\n- b");
    expect(b).toEqual([
      { type: "list", ordered: true, items: ["one", "two"] },
      { type: "list", items: ["a", "b"] },
    ]);
  });
  it("parses a blockquote, collapsing consecutive > lines", () => {
    expect(parseBlocks("> quoted line\n> still quoted")).toEqual([
      { type: "quote", text: "quoted line still quoted" },
    ]);
  });
  it("parses horizontal rules (---, ***, ___)", () => {
    expect(parseBlocks("---")).toEqual([{ type: "hr" }]);
    expect(parseBlocks("***")).toEqual([{ type: "hr" }]);
    expect(parseBlocks("___")).toEqual([{ type: "hr" }]);
  });
  it("parses a standalone http(s) image line", () => {
    expect(parseBlocks("![logo](https://x.com/a.png)")).toEqual([
      { type: "image", alt: "logo", src: "https://x.com/a.png" },
    ]);
  });
  it("does not treat a non-http image as a block image", () => {
    const b = parseBlocks("![x](/local.png)");
    expect(b[0].type).not.toBe("image");
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
