import { fileAnchorHash, fileAnchorLink, parseFileAnchor, fileAnchorId, activeFileIndex } from "../lib/fileAnchor";

describe("fileAnchor", () => {
  it("builds a hash from a file path", () => {
    expect(fileAnchorHash("src/index.ts")).toBe("#file=src%2Findex.ts");
  });

  it("round-trips path → hash → path", () => {
    for (const p of ["a.txt", "src/deep/dir/file.py", "weird name & symbols.md"]) {
      expect(parseFileAnchor(fileAnchorHash(p))).toBe(p);
    }
  });

  it("parses a hash with or without the leading '#'", () => {
    expect(parseFileAnchor("#file=a%2Fb.ts")).toBe("a/b.ts");
    expect(parseFileAnchor("file=a%2Fb.ts")).toBe("a/b.ts");
  });

  it("returns null for a hash that isn't a file anchor", () => {
    expect(parseFileAnchor("#section-2")).toBeNull();
    expect(parseFileAnchor("")).toBeNull();
    expect(parseFileAnchor("#file=")).toBeNull();
  });

  it("builds a full link by appending the hash to a base url", () => {
    expect(fileAnchorLink("https://x.com/prompt/1", "a.ts")).toBe("https://x.com/prompt/1#file=a.ts");
    // strips an existing hash on the base first
    expect(fileAnchorLink("https://x.com/prompt/1#file=old.ts", "new.ts")).toBe("https://x.com/prompt/1#file=new.ts");
  });

  it("produces a stable DOM id for a path (safe characters only)", () => {
    const id = fileAnchorId("src/My File.ts");
    expect(id).toMatch(/^file-[A-Za-z0-9_-]+$/);
    expect(fileAnchorId("src/My File.ts")).toBe(id); // deterministic
    expect(fileAnchorId("other.ts")).not.toBe(id); // distinct paths differ
  });

  describe("activeFileIndex", () => {
    const paths = ["prompt.txt", "system.md", "examples.json"];
    it("returns the index of the requested path", () => {
      expect(activeFileIndex(paths, "system.md")).toBe(1);
      expect(activeFileIndex(paths, "examples.json")).toBe(2);
    });
    it("defaults to 0 when the request is missing or unknown", () => {
      expect(activeFileIndex(paths, null)).toBe(0);
      expect(activeFileIndex(paths, undefined)).toBe(0);
      expect(activeFileIndex(paths, "does-not-exist.ts")).toBe(0);
    });
    it("returns 0 for an empty file list", () => {
      expect(activeFileIndex([], "anything")).toBe(0);
    });
  });
});
