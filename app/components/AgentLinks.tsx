"use client";

import { useState } from "react";
import { buildAgentTargets, type AgentTarget } from "@/lib/agentLinks";
import { track } from "./AnalyticsBeacon";

// Launch the desktop app via its custom URL scheme without navigating away from
// the current page: a hidden iframe pointed at the scheme hands off to the OS if
// the app is registered, and silently does nothing if it isn't (the clipboard
// copy is the real payload either way). location.href would risk unloading the
// page / showing a browser error dialog, so we avoid it.
function launchScheme(scheme: string) {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = scheme;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        iframe.remove();
      } catch {
        /* already gone */
      }
    }, 1500);
  } catch {
    /* iframe blocked — the clipboard copy still lets the user paste manually */
  }
}

// "Use in your agent" buttons for prompts meant for coding agents. Each click
// copies the prompt to the clipboard and — for agents with a URL scheme — opens
// the app so the user can paste straight into its chat. Claude Code (a terminal
// CLI, no scheme) is copy-only. Sibling of AssistantLinks (web chat UIs); the
// prompt detail view shows web chat, agent, or both lists depending on the
// prompt's `useWith` (see lib/useWith useWithSurfaces).
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
    if (t.scheme) launchScheme(t.scheme);
    setActive(t);
    track("cta_click", typeof window !== "undefined" ? window.location.pathname : "/", {
      action: t.scheme ? "open_in_agent" : "copy_for_agent",
      agent: t.id,
    });
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
            title={t.scheme ? `Opens ${t.label} and copies the prompt — ${t.hint}` : `Copies the prompt — ${t.hint}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {active?.id === t.id ? "Copied ✓ " : t.scheme ? "Open in " : "Copy for "}
            {t.label}
            {t.scheme && active?.id !== t.id ? " ↗" : ""}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
        {active
          ? active.scheme
            ? `Opening ${active.label} — the prompt is copied, ${active.hint} (⌘/Ctrl+V).`
            : `Copied — ${active.hint}.`
          : "Copies the prompt and opens your agent (Claude Code: copy only) — then paste it into the chat."}
      </p>
    </div>
  );
}
