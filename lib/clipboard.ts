// Shared copy-to-clipboard feedback so every "Copy" button behaves identically:
// one feedback duration and one label rule, instead of each component picking
// its own timeout and "Copied!" wording.

export const COPY_FEEDBACK_MS = 1500;

// The label a copy button should show given its copied state.
export function copyLabel(copied: boolean, idleLabel: string, doneLabel = "Copied!"): string {
  return copied ? doneLabel : idleLabel;
}
