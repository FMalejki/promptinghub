"use client";
import { useEffect, useState } from "react";

type Version = {
  version: number;
  name: string;
  body: string;
  files: { path: string; content: string }[] | null;
  createdAt: string;
};

export function VersionHistory({ promptId, canRestore = false }: { promptId: string; canRestore?: boolean }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);

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
                {canRestore && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => restore(v.version)}
                      disabled={restoring === v.version}
                      className="px-3 py-1.5 text-xs bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg"
                    >
                      {restoring === v.version ? "Restoring…" : `Restore v${v.version}`}
                    </button>
                  </div>
                )}
                {(v.files ?? [{ path: "prompt.txt", content: v.body }]).map((f, i) => (
                  <div key={i}>
                    <div className="text-xs font-mono text-gray-400 mb-1">{f.path}</div>
                    <pre className="px-3 py-2 text-xs font-mono whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 rounded text-gray-700 dark:text-gray-300 overflow-x-auto">{f.content}</pre>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
