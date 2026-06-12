// Build a nested folder tree from flat file paths (e.g. "src/agent/main.ts").
// Pure + network-free so the UI tree and tests share one source of truth.

export type FileLeaf = { type: "file"; name: string; path: string };
export type DirNode = { type: "dir"; name: string; path: string; children: TreeNode[] };
export type TreeNode = FileLeaf | DirNode;

// Folders first, then files; each group alphabetical (case-insensitive, stable).
function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function buildFileTree(paths: string[]): TreeNode[] {
  const root: DirNode = { type: "dir", name: "", path: "", children: [] };

  for (const raw of paths) {
    const path = (raw || "").trim().replace(/^\/+/, "");
    if (!path) continue;
    const segs = path.split("/").filter(Boolean);
    let cur = root;
    segs.forEach((seg, i) => {
      const isLeaf = i === segs.length - 1;
      const here = segs.slice(0, i + 1).join("/");
      if (isLeaf) {
        if (!cur.children.some((c) => c.type === "file" && c.path === here)) {
          cur.children.push({ type: "file", name: seg, path: here });
        }
      } else {
        let dir = cur.children.find((c): c is DirNode => c.type === "dir" && c.name === seg);
        if (!dir) {
          dir = { type: "dir", name: seg, path: here, children: [] };
          cur.children.push(dir);
        }
        cur = dir;
      }
    });
  }

  // Sort every directory's children recursively.
  const walk = (n: DirNode) => {
    sortNodes(n.children);
    for (const c of n.children) if (c.type === "dir") walk(c);
  };
  walk(root);
  return root.children;
}

// Every directory path in the tree (handy for "expand all" default state).
export function allDirPaths(nodes: TreeNode[]): string[] {
  const out: string[] = [];
  const walk = (ns: TreeNode[]) => {
    for (const n of ns) {
      if (n.type === "dir") {
        out.push(n.path);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return out;
}
