"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Collection = { id: string; name: string };

export function SaveToCollection({ promptId }: { promptId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (open && session?.user?.email) {
      fetch("/api/collections")
        .then((r) => (r.ok ? r.json() : { collections: [] }))
        .then((d) => setCollections(d.collections || []))
        .catch(() => {});
    }
  }, [open, session]);

  async function addTo(id: string, name: string) {
    const res = await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", promptId }),
    });
    if (res.ok) {
      setSaved(name);
      setTimeout(() => {
        setSaved(null);
        setOpen(false);
      }, 1200);
    }
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const { id } = await res.json();
        await addTo(id, newName.trim());
        setNewName("");
      }
    } finally {
      setCreating(false);
    }
  }

  function onClick() {
    if (!session?.user?.email) {
      router.push("/login");
      return;
    }
    setOpen((o) => !o);
  }

  return (
    <div className="relative">
      <button
        onClick={onClick}
        title="Save this prompt to one of your collections"
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        Save
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2">
          {saved ? (
            <div className="px-3 py-2 text-sm text-green-600 dark:text-green-400">Saved to “{saved}”</div>
          ) : (
            <>
              <div className="max-h-48 overflow-y-auto">
                {collections.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No collections yet.</div>
                ) : (
                  collections.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addTo(c.id, c.name)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New collection…"
                  className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={createAndAdd}
                  disabled={creating || !newName.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
                >
                  Add
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
