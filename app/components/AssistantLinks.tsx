"use client";

import { useState } from "react";
import { buildAssistantLinks, type Assistant } from "@/lib/llmLinks";

// "Run it" buttons that open a prompt in an external assistant. Every click
// copies the prompt to the clipboard first (a robust fallback — prefill query
// params get truncated on long prompts, and Gemini has no prefill at all), then
// opens the assistant in a new tab. The clipboard write is fire-and-forget and
// the window.open stays synchronous so popup blockers don't trip.
export function AssistantLinks({ text, onOpen }: { text: string; onOpen?: () => void }) {
  const links = buildAssistantLinks(text);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  if (!links) return null;

  function open(a: Assistant) {
    try {
      void navigator.clipboard?.writeText(text.trim());
    } catch {
      /* clipboard may be unavailable (insecure context) — opening still works */
    }
    setCopiedId(a.id);
    onOpen?.();
    window.open(a.url, "_blank", "noopener,noreferrer");
    setTimeout(() => setCopiedId((c) => (c === a.id ? null : c)), 2500);
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Run it:</span>
        {links.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => open(a)}
            title={
              a.prefilled
                ? `Opens ${a.label} with the prompt prefilled (also copied to your clipboard)`
                : `Copies the prompt, then opens ${a.label} — paste it with ⌘/Ctrl+V`
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {copiedId === a.id ? "Copied ✓ " : "Open in "}
            {a.label} ↗
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
        Copies the prompt to your clipboard, then opens the assistant. For Gemini, paste it in (⌘/Ctrl+V).
      </p>
    </div>
  );
}
