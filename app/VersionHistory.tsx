"use client";
import { useEffect, useState } from "react";
import { diffLines, diffStats } from "@/lib/diff";

type Version = {
  version: number;
  name: string;
  body: string;
  files: { path: string; content: string }[] | null;
  createdAt: string;
};

type Snapshot = { body: string; files: { path: string; content: string }[] | null };

// Flatten a version/current snapshot into a single comparable text blob.
function snapshotText(s: Snapshot): string {
  if (s.files && s.files.length) return s.files.map((f) => `# ${f.path}\n${f.content}`).join("\n\n");
  return s.body ?? "";
}

export function VersionHistory({
  promptId,
  canRestore = false,
  current,
}: {
  promptId: string;
  canRestore?: boolean;
  current?: Snapshot;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [comparing, setComparing] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/prompts/${promptId}/versions`)
      .then((r) => (r.ok ? r.json() : { versions: [] }))
      .then((d) => setVersions(d.versions || []))
      .catch(() => {});
  }, [promptId]);

  async function restore(version: number) {
    if (!confirm(`Restore version ${version}? The current content is saved to history first.`)) return;
    setRestoring(version);
    const res = await fetch(`/api/prompts/${promptId}/versions/${version}/restore`, { method: "POST" });
    if (res.ok) window.location.reload();
    else setRestoring(null);
  }

  if (versions.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Version history <span className="text-gray-400">({versions.length} previous)</span>
      </h2>
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.version} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpen(open === v.version ? null : v.version)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="text-gray-700 dark:text-gray-300">
                <span className="font-mono text-xs text-gray-400 mr-2">v{v.version}</span>
                {v.name}
              </span>
              <span className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleString()}</span>
            </button>
            {open === v.version && (
              <div className="p-4 space-y-3 bg-white dark:bg-gray-800">
                <div className="flex justify-end gap-2">
                  {current && (
                    <button
                      onClick={() => setComparing(comparing === v.version ? null : v.version)}
                      className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                    >
                      {comparing === v.version ? "Hide diff" : "Compare with current"}
                    </button>
                  )}
                  {canRestore && (
                    <button
                      onClick={() => restore(v.version)}
                      disabled={restoring === v.version}
                      className="px-3 py-1.5 text-xs bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg"
                    >
                      {restoring === v.version ? "Restoring…" : `Restore v${v.version}`}
                    </button>
                  )}
                </div>
                {comparing === v.version && current ? (
                  (() => {
                    const before = snapshotText({ body: v.body, files: v.files });
                    const after = snapshotText(current);
                    const { added, removed } = diffStats(before, after);
                    return (
                      <div>
                        <div className="text-xs font-mono mb-1">
                          <span className="text-gray-400">v{v.version} → current </span>
                          <span className="text-green-600 dark:text-green-400">+{added}</span>{" "}
                          <span className="text-red-600 dark:text-red-400">−{removed}</span>
                        </div>
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 rounded overflow-x-auto">
                          {diffLines(before, after).map((seg, i) => (
                            <div
                              key={i}
                              className={
                                seg.type === "add"
                                  ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3"
                                  : seg.type === "del"
                                  ? "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-3"
                                  : "text-gray-600 dark:text-gray-400 px-3"
                              }
                            >
                              <span className="select-none text-gray-400 mr-2">{seg.type === "add" ? "+" : seg.type === "del" ? "−" : " "}</span>
                              {seg.text || " "}
                            </div>
                          ))}
                        </pre>
                      </div>
                    );
                  })()
                ) : (
                  (v.files ?? [{ path: "prompt.txt", content: v.body }]).map((f, i) => (
                    <div key={i}>
                      <div className="text-xs font-mono text-gray-400 mb-1">{f.path}</div>
                      <pre className="px-3 py-2 text-xs font-mono whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 rounded text-gray-700 dark:text-gray-300 overflow-x-auto">{f.content}</pre>
                    </div>
                  ))
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
