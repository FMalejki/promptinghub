"use client";
import { useMemo, useState } from "react";
import { buildFileTree, allDirPaths, type TreeNode } from "@/lib/fileTree";

// A clickable folder tree for multi-file prompts. Folders collapse/expand; files
// select. Built from flat paths via the shared buildFileTree, so it matches the
// repo's real directory structure.
export function FileTree({
  paths,
  activePath,
  onSelect,
}: {
  paths: string[];
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const tree = useMemo(() => buildFileTree(paths), [paths]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(dir: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(dir) ? next.delete(dir) : next.add(dir);
      return next;
    });
  }

  return (
    <div className="text-sm" role="tree" aria-label="Files">
      {tree.map((n) => (
        <TreeRow key={n.path} node={n} depth={0} collapsed={collapsed} toggle={toggle} activePath={activePath} onSelect={onSelect} />
      ))}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  collapsed,
  toggle,
  activePath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  collapsed: Set<string>;
  toggle: (dir: string) => void;
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.type === "dir") {
    const isOpen = !collapsed.has(node.path);
    return (
      <div>
        <button
          type="button"
          onClick={() => toggle(node.path)}
          style={pad}
          className="flex w-full items-center gap-1.5 py-1 pr-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded"
          aria-expanded={isOpen}
        >
          <svg className={`w-3 h-3 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-3.5 h-3.5 shrink-0 text-blue-500/80" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {isOpen && node.children.map((c) => (
          <TreeRow key={c.path} node={c} depth={depth + 1} collapsed={collapsed} toggle={toggle} activePath={activePath} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  const active = node.path === activePath;
  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      style={pad}
      title={node.path}
      role="treeitem"
      aria-selected={active}
      className={`flex w-full items-center gap-1.5 py-1 pr-2 text-left rounded font-mono ${
        active
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
      }`}
    >
      <span className="w-3 shrink-0" aria-hidden />
      <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// Re-exported for callers that want the default expanded set, etc.
export { allDirPaths };
