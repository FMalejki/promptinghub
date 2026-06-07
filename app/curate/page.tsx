"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "../components/Navbar";

type Draft = { id: string; source: string; name: string; description: string; category: string; body: string; createdAt: string };

export default function CuratePage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "forbidden">("loading");

  function load() {
    fetch("/api/ingested")
      .then((r) => {
        if (r.status === 403 || r.status === 401) {
          setStatus("forbidden");
          return { drafts: [] };
        }
        setStatus("ok");
        return r.json();
      })
      .then((d) => setDrafts(d.drafts || []))
      .catch(() => setStatus("forbidden"));
  }
  useEffect(load, []);

  async function approve(id: string) {
    const res = await fetch(`/api/ingested/${id}`, { method: "POST" });
    if (res.ok) {
      const { promptId } = await res.json();
      router.push(`/prompt/${promptId}`);
    }
  }
  async function dismiss(id: string) {
    const res = await fetch(`/api/ingested/${id}`, { method: "DELETE" });
    if (res.ok) setDrafts((ds) => ds.filter((d) => d.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Curate ingested drafts</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Review prompts pulled from external sources. Approve to publish under your account, or dismiss.</p>

        {status === "loading" && <p className="text-gray-400">Loading…</p>}
        {status === "forbidden" && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">This page is for verified curators only.</div>
        )}
        {status === "ok" && drafts.length === 0 && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No pending drafts. (Ingestion runs daily once an X API token is configured.)</div>
        )}
        {status === "ok" && drafts.length > 0 && (
          <ul className="space-y-4">
            {drafts.map((d) => (
              <li key={d.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{d.source}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{d.category}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{d.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{d.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => approve(d.id)} className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg">Approve</button>
                    <button onClick={() => dismiss(d.id)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Dismiss</button>
                  </div>
                </div>
                <pre className="mt-3 px-3 py-2 text-xs font-mono whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 rounded text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto">{d.body}</pre>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
