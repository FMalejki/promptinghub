"use client";
import { useState } from "react";
import { buildApiSnippets } from "@/lib/apiSnippet";

export function ApiSnippet({ promptId }: { promptId: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"curl" | "node">("curl");
  const [copied, setCopied] = useState(false);

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const snippets = buildApiSnippets(base, promptId);
  const code = tab === "curl" ? snippets.curl : snippets.node;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="mt-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
      >
        <svg className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Use via API
      </button>

      {open && (
        <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-1">
              {(["curl", "node"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-2.5 py-1 text-xs rounded ${
                    tab === t
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  {t === "curl" ? "cURL" : "Node"}
                </button>
              ))}
            </div>
            <button onClick={copy} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="px-3 py-3 text-xs font-mono whitespace-pre-wrap break-words bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 overflow-x-auto">{code}</pre>
        </div>
      )}
    </div>
  );
}
