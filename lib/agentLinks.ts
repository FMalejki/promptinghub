// "Use this prompt in a coding agent" targets. Most of these editors are VS Code
// forks (Cursor, Windsurf, Antigravity) or VS Code itself, and register a custom
// URL scheme that LAUNCHES the app from the browser (cursor://, vscode://,
// windsurf://, antigravity://). We use that to actually open the agent — but none
// of them expose a public "prefill the chat with this text" deep link (Cursor's
// is an open feature request), so we ALSO copy the prompt to the clipboard and
// tell the user to paste it into the agent's chat. Claude Code is the exception:
// it's a terminal CLI with no URL scheme, so it can't be launched from a link —
// that one is copy-only. Kept pure + unit-testable.

export type AgentId = "claude-code" | "cursor" | "antigravity" | "vscode" | "windsurf";

export type AgentTarget = {
  id: AgentId;
  label: string;
  // Custom URL scheme that launches the desktop app, or null when there's no way
  // to open it from a link (Claude Code — a terminal CLI). When present we open
  // it on click; when null the button is copy-only.
  scheme: string | null;
  // Short instruction shown after the action — where to paste in this tool.
  hint: string;
};

// Ordered for coding-agent prompts. Claude Code first (most common here), then
// the launchable editors. Labels are the product names users recognize; hints
// name the actual chat surface + its open shortcut.
export const AGENT_TARGETS: AgentTarget[] = [
  { id: "claude-code", label: "Claude Code", scheme: null, hint: "paste it into your Claude Code session" },
  { id: "cursor", label: "Cursor", scheme: "cursor://", hint: "paste into Cursor chat (⌘L / Ctrl+L)" },
  { id: "antigravity", label: "Antigravity", scheme: "antigravity://", hint: "paste into Antigravity's agent (⌘L / Ctrl+L)" },
  { id: "vscode", label: "VS Code", scheme: "vscode://", hint: "paste into Copilot Chat (⌃⌘I / Ctrl+Alt+I)" },
  { id: "windsurf", label: "Windsurf", scheme: "windsurf://", hint: "paste into Cascade (⌘L / Ctrl+L)" },
];

/** The agent targets to offer for a prompt — null when there's no text to use. */
export function buildAgentTargets(text: string): AgentTarget[] | null {
  return (text || "").trim() ? AGENT_TARGETS : null;
}
