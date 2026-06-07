"use client";
import { useEffect, useState } from "react";

type KeyInfo = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null };

export function ApiKeysManager() {
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null); // raw key shown once

  function load() {
    fetch("/api/keys")
      .then((r) => (r.ok ? r.json() : { keys: [] }))
      .then((d) => setKeys(d.keys || []))
      .catch(() => {});
  }
  useEffect(load, []);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const { key } = await res.json();
        setFresh(key);
        setName("");
        load();
      }
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Apps using it will stop working.")) return;
    const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (res.ok) setKeys((ks) => ks.filter((k) => k.id !== id));
  }

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">API Keys</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Use a key with <code className="font-mono text-xs">Authorization: Bearer ph_…</code> against{" "}
        <code className="font-mono text-xs">/api/v1/prompts</code>.
      </p>

      {fresh && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-800 dark:text-green-300 mb-1">Copy your key now — it won’t be shown again:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1 text-xs font-mono bg-white dark:bg-gray-900 rounded border border-green-200 dark:border-green-800 text-gray-900 dark:text-gray-100 break-all">{fresh}</code>
            <button onClick={() => navigator.clipboard.writeText(fresh)} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Copy</button>
            <button onClick={() => setFresh(null)} className="px-2 py-1 text-xs text-gray-500">Done</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. CI, my-script)"
          maxLength={80}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={create}
          disabled={creating || !name.trim()}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
        >
          Create key
        </button>
      </div>

      {keys.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No keys yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{k.name}</div>
                <div className="text-xs font-mono text-gray-400">{k.prefix}…··· · created {new Date(k.createdAt).toLocaleDateString()}{k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}</div>
              </div>
              <button onClick={() => revoke(k.id)} className="text-xs text-gray-400 hover:text-red-600 shrink-0">revoke</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
