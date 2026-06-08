// Keyboard shortcut metadata + a pure trigger test for the help (?) overlay, so
// the decision logic is unit-testable without a DOM.

export type Shortcut = { keys: string[]; label: string };

export const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], label: "Open command palette / search" },
  { keys: ["/"], label: "Focus the search box" },
  { keys: ["?"], label: "Show this shortcuts help" },
  { keys: ["Esc"], label: "Close palette or dialog" },
  { keys: ["g", "b"], label: "Go to Browse" },
  { keys: ["g", "d"], label: "Go to Dashboard" },
];

type KeyEventLike = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean } | null;
};

// True when "?" should open the help overlay: unmodified, and not while the user
// is typing into a form field or contentEditable region.
export function isHelpTrigger(e: KeyEventLike): boolean {
  if (e.key !== "?" || e.metaKey || e.ctrlKey) return false;
  const tag = e.target?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
  if (e.target?.isContentEditable) return false;
  return true;
}

// True when "/" should focus the search box: unmodified, and not while the user
// is already typing into a form field or contentEditable region.
export function isSearchFocusTrigger(e: KeyEventLike): boolean {
  if (e.key !== "/" || e.metaKey || e.ctrlKey) return false;
  const tag = e.target?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
  if (e.target?.isContentEditable) return false;
  return true;
}
