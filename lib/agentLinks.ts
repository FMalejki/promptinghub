// "Use this prompt in a coding agent" targets. Unlike web chat assistants
// (lib/llmLinks), coding agents like Claude Code, Cursor or Windsurf have no
// reliable URL scheme to prefill their chat from a web page — the prompt-prefill
// deeplink is, as of mid-2026, an open feature request for Cursor and doesn't
// exist for the Claude Code CLI at all. So the honest, never-broken action is:
// copy the prompt to the clipboard and tell the user exactly where to paste it
// in each tool. This list is the data behind that UI; kept pure + unit-testable.

export type AgentId = "claude-code" | "cursor" | "vscode" | "windsurf";

export type AgentTarget = {
  id: AgentId;
  label: string;
  // Short instruction shown after copying — where to paste in this tool.
  hint: string;
};

// Ordered by popularity for coding-agent prompts. Labels are the product names
// users recognize; hints name the actual chat surface + its open shortcut.
export const AGENT_TARGETS: AgentTarget[] = [
  { id: "claude-code", label: "Claude Code", hint: "paste it into your Claude Code session" },
  { id: "cursor", label: "Cursor", hint: "paste into Cursor chat (⌘L / Ctrl+L)" },
  { id: "vscode", label: "VS Code", hint: "paste into Copilot Chat (⌃⌘I / Ctrl+Alt+I)" },
  { id: "windsurf", label: "Windsurf", hint: "paste into Cascade (⌘L / Ctrl+L)" },
];

/** The agent targets to offer for a prompt — null when there's no text to use. */
export function buildAgentTargets(text: string): AgentTarget[] | null {
  return (text || "").trim() ? AGENT_TARGETS : null;
}
