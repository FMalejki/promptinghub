"use client";

import { useState } from "react";
import { buildAgentTargets, type AgentTarget } from "@/lib/agentLinks";
import { track } from "./AnalyticsBeacon";

// "Use in your agent" buttons for prompts meant for coding agents (Claude Code,
// Cursor, VS Code/Copilot, Windsurf). These tools have no reliable prompt-prefill
// URL scheme, so each button copies the prompt to the clipboard and shows where
// to paste it. Sibling of AssistantLinks (which opens web chat UIs); the prompt
// detail view shows web chat, agent, or both lists depending on the prompt's
// `useWith` (see lib/useWith useWithSurfaces).
export function AgentLinks({ text, onCopy }: { text: string; onCopy?: () => void }) {
  const targets = buildAgentTargets(text);
  const [active, setActive] = useState<AgentTarget | null>(null);
  if (!targets) return null;

  function use(t: AgentTarget) {
    try {
      void navigator.clipboard?.writeText(text.trim());
    } catch {
      /* clipboard may be unavailable (insecure context) — hint still helps */
    }
    setActive(t);
    track("cta_click", typeof window !== "undefined" ? window.location.pathname : "/", { action: "copy_for_agent", agent: t.id });
    onCopy?.();
    setTimeout(() => setActive((c) => (c?.id === t.id ? null : c)), 4000);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Use in your agent:</span>
        {targets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => use(t)}
            title={`Copies the prompt — ${t.hint}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {active?.id === t.id ? "Copied ✓ " : "Copy for "}
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
        {active ? `Copied — ${active.hint}.` : "Copies the prompt to your clipboard, then paste it into your coding agent."}
      </p>
    </div>
  );
}
