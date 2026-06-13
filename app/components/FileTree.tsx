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
  onDeleteFolder,
  onDeleteFile,
  matchCounts,
}: {
  paths: string[];
  activePath: string | null;
  onSelect: (path: string) => void;
  // Editor-only: when provided, each folder shows a delete control that removes
  // the folder and every file under it. Omitted on the read-only detail view.
  onDeleteFolder?: (dirPath: string) => void;
  // Editor-only: when provided, each file shows a delete control. Omitted on the
  // read-only detail view.
  onDeleteFile?: (path: string) => void;
  // Search mode: path → match count. When provided, files with matches show a
  // count badge and files with none are dimmed, so the user can spot which files
  // contain the query at a glance.
  matchCounts?: Record<string, number>;
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
        <TreeRow key={n.path} node={n} depth={0} collapsed={collapsed} toggle={toggle} activePath={activePath} onSelect={onSelect} onDeleteFolder={onDeleteFolder} onDeleteFile={onDeleteFile} matchCounts={matchCounts} />
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
  onDeleteFolder,
  onDeleteFile,
  matchCounts,
}: {
  node: TreeNode;
  depth: number;
  collapsed: Set<string>;
  toggle: (dir: string) => void;
  activePath: string | null;
  onSelect: (path: string) => void;
  onDeleteFolder?: (dirPath: string) => void;
  onDeleteFile?: (path: string) => void;
  matchCounts?: Record<string, number>;
}) {
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.type === "dir") {
    const isOpen = !collapsed.has(node.path);
    return (
      <div>
        <div className="group flex w-full items-center rounded hover:bg-gray-100 dark:hover:bg-gray-700/50">
          <button
            type="button"
            onClick={() => toggle(node.path)}
            style={pad}
            className="flex flex-1 min-w-0 items-center gap-1.5 py-1 pr-1 text-left text-gray-700 dark:text-gray-300"
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
          {onDeleteFolder && (
            <button
              type="button"
              onClick={() => onDeleteFolder(node.path)}
              title={`Delete folder "${node.name}" and its files`}
              aria-label={`Delete folder ${node.name}`}
              className="shrink-0 px-1.5 py-1 text-gray-300 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        {isOpen && node.children.map((c) => (
          <TreeRow key={c.path} node={c} depth={depth + 1} collapsed={collapsed} toggle={toggle} activePath={activePath} onSelect={onSelect} onDeleteFolder={onDeleteFolder} onDeleteFile={onDeleteFile} matchCounts={matchCounts} />
        ))}
      </div>
    );
  }

  const active = node.path === activePath;
  const searching = !!matchCounts;
  const count = matchCounts?.[node.path] ?? 0;
  const dimmed = searching && count === 0;
  return (
    <div className={`group flex w-full items-center rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 ${dimmed ? "opacity-40" : ""}`}>
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        style={pad}
        title={node.path}
        role="treeitem"
        aria-selected={active}
        className={`flex flex-1 min-w-0 items-center gap-1.5 py-1 pr-2 text-left rounded font-mono ${
          active
            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        <span className="w-3 shrink-0" aria-hidden />
        <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="truncate">{node.name}</span>
        {count > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-yellow-200 dark:bg-yellow-500/40 text-yellow-800 dark:text-yellow-200 text-[10px] font-semibold px-1.5 py-0.5 tabular-nums">
            {count}
          </span>
        )}
      </button>
      {onDeleteFile && (
        <button
          type="button"
          onClick={() => onDeleteFile(node.path)}
          title={`Delete file "${node.name}"`}
          aria-label={`Delete file ${node.name}`}
          className="shrink-0 px-1.5 py-1 text-gray-300 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Re-exported for callers that want the default expanded set, etc.
export { allDirPaths };
