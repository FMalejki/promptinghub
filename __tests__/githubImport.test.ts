import {
  parseRepoRef,
  isImportablePath,
  selectFiles,
  buildDraft,
  DEFAULT_CAPS,
  type TreeBlob,
} from "../lib/githubImport";

describe("parseRepoRef", () => {
  it("parses a plain repo URL", () => {
    expect(parseRepoRef("https://github.com/karpathy/nanoGPT")).toEqual({
      owner: "karpathy",
      repo: "nanoGPT",
    });
  });
  it("parses a tree URL with ref + subpath", () => {
    expect(parseRepoRef("https://github.com/vercel/next.js/tree/canary/packages/next")).toEqual({
      owner: "vercel",
      repo: "next.js",
      ref: "canary",
      subpath: "packages/next",
    });
  });
  it("parses bare owner/repo and strips .git", () => {
    expect(parseRepoRef("karpathy/micrograd")).toEqual({ owner: "karpathy", repo: "micrograd" });
    expect(parseRepoRef("https://github.com/a/b.git")).toEqual({ owner: "a", repo: "b" });
  });
  it("rejects non-github and junk", () => {
    expect(parseRepoRef("https://gitlab.com/a/b")).toBeNull();
    expect(parseRepoRef("not a url")).toBeNull();
    expect(parseRepoRef("")).toBeNull();
  });
});

describe("isImportablePath", () => {
  it("keeps source/text files", () => {
    for (const p of ["src/index.ts", "main.py", "db/schema.sql", "README.md", "Dockerfile", "infra/main.tf"]) {
      expect(isImportablePath(p)).toBe(true);
    }
  });
  it("skips binaries, build dirs, and minified", () => {
    for (const p of ["node_modules/x/index.js", "dist/app.js", "logo.png", "fonts/a.woff2", "vendor/lib.rb", "app.min.js", ".git/config"]) {
      expect(isImportablePath(p)).toBe(false);
    }
  });
});

describe("selectFiles", () => {
  const blobs: TreeBlob[] = [
    { path: "README.md", size: 2000 },
    { path: "src/a.ts", size: 1000 },
    { path: "node_modules/x.js", size: 10 },
    { path: "img.png", size: 50 },
    { path: "src/b.ts", size: 1000 },
  ];
  it("filters non-importable and floats README first", () => {
    const sel = selectFiles(blobs);
    expect(sel.selected.map((b) => b.path)).toEqual(["README.md", "src/a.ts", "src/b.ts"]);
    expect(sel.skipped).toBe(2); // node_modules + png
  });
  it("respects maxFiles cap and reports truncation", () => {
    const sel = selectFiles(blobs, { ...DEFAULT_CAPS, maxFiles: 2 });
    expect(sel.selected).toHaveLength(2);
    expect(sel.truncated).toBe(true);
  });
  it("drops files larger than the per-file byte cap", () => {
    const sel = selectFiles([{ path: "big.ts", size: 999999 }], { ...DEFAULT_CAPS, maxFileBytes: 1000 });
    expect(sel.selected).toHaveLength(0);
  });
  it("imports a realistic repo (74 small text files) fully under the default caps", () => {
    // Owner hit truncation on a ~74-file repo with the old maxFiles:40 cap. The
    // default caps must be generous enough that ordinary repos import whole.
    const many: TreeBlob[] = Array.from({ length: 74 }, (_, i) => ({ path: `src/file-${i}.ts`, size: 1200 }));
    const sel = selectFiles(many);
    expect(sel.selected).toHaveLength(74);
    expect(sel.truncated).toBe(false);
  });
});

describe("buildDraft", () => {
  it("assembles a Coding draft with tags + attribution-ish description", () => {
    const draft = buildDraft(
      { owner: "karpathy", repo: "micrograd" },
      { description: "A tiny autograd engine", language: "Python" },
      [{ path: "micrograd/engine.py", content: "class Value: pass" }],
      { skipped: 3, truncated: false },
    );
    expect(draft.category).toBe("Coding");
    expect(draft.name).toBe("micrograd");
    expect(draft.tags).toEqual(expect.arrayContaining(["micrograd", "github", "python"]));
    expect(draft.description).toContain("github.com/karpathy/micrograd");
    expect(draft.notes).toEqual({ skipped: 3, truncated: false, imported: 1 });
  });
});
