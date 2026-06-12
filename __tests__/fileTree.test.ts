import { buildFileTree, allDirPaths, type DirNode } from "../lib/fileTree";

describe("buildFileTree", () => {
  it("nests files under their folders", () => {
    const tree = buildFileTree(["README.md", "src/index.ts", "src/agent/main.ts"]);
    // dirs first (src), then files (README.md)
    expect(tree.map((n) => n.name)).toEqual(["src", "README.md"]);
    const src = tree[0] as DirNode;
    expect(src.type).toBe("dir");
    expect(src.children.map((n) => n.name)).toEqual(["agent", "index.ts"]);
    const agent = src.children[0] as DirNode;
    expect(agent.children).toEqual([{ type: "file", name: "main.ts", path: "src/agent/main.ts" }]);
  });

  it("sorts folders before files, alphabetically within each group", () => {
    const tree = buildFileTree(["z.txt", "a.txt", "lib/b.ts", "app/c.ts"]);
    expect(tree.map((n) => `${n.type}:${n.name}`)).toEqual(["dir:app", "dir:lib", "file:a.txt", "file:z.txt"]);
  });

  it("carries the full path on each leaf and tolerates leading slashes / dupes", () => {
    const tree = buildFileTree(["/src/a.ts", "src/a.ts"]);
    const src = tree[0] as DirNode;
    expect(src.children).toEqual([{ type: "file", name: "a.ts", path: "src/a.ts" }]);
  });

  it("ignores empty paths", () => {
    expect(buildFileTree(["", "  ", "ok.md"]).map((n) => n.name)).toEqual(["ok.md"]);
  });

  it("allDirPaths lists every directory for expand-all defaults", () => {
    const tree = buildFileTree(["a/b/c.ts", "a/d.ts", "e.ts"]);
    expect(allDirPaths(tree).sort()).toEqual(["a", "a/b"]);
  });
});
