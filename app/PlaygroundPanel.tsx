"use client";
import { useEffect, useState } from "react";

// "Run this prompt" panel. Env-gated server-side: if no provider key is set the
// API reports { configured:false } and we show a quiet "not configured" note
// instead of a Run button — never a broken/disabled mystery.
export function PlaygroundPanel({ text }: { text: string }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/playground")
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d) => active && setConfigured(!!d.configured))
      .catch(() => active && setConfigured(false));
    return () => {
      active = false;
    };
  }, []);

  async function run() {
    setRunning(true);
    setError(null);
    setOutput(null);
    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 401) setError("Sign in to run prompts in the playground.");
      else if (!res.ok) setError(body?.error || "Run failed.");
      else setOutput(body?.output ?? "");
    } catch {
      setError("Run failed.");
    } finally {
      setRunning(false);
    }
  }

  if (configured === null) return null; // probing — don't flash

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Playground</h2>
        {configured && (
          <button
            onClick={run}
            disabled={running || !text.trim()}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
          >
            {running ? "Running…" : "Run prompt"}
          </button>
        )}
      </div>

      {!configured ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Live running isn’t enabled on this instance. Set <code className="text-xs">GROQ_API_KEY</code> (free),{" "}
          <code className="text-xs">ANTHROPIC_API_KEY</code> or <code className="text-xs">OPENAI_API_KEY</code> to try
          prompts against a model here.
        </p>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Run this prompt (with your filled-in variables) against a model and see the output.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {output !== null && (
        <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-[400px] overflow-auto">
          {output || "(empty response)"}
        </pre>
      )}
    </div>
  );
}
