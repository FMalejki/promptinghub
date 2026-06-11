// "Best used with" target for a prompt: is it meant for a web chat UI, a coding
// agent, or both? Pure normalization so it can be shared by createPrompt,
// updatePrompt, the zod schema, and the browse filter, and unit-tested cleanly.

export const USE_WITH_VALUES = ["chat", "agent", "both"] as const;
export type UseWith = (typeof USE_WITH_VALUES)[number];

/** Normalize any raw value to a valid UseWith (defaults to "both"). */
export function resolveUseWith(input: unknown): UseWith {
  if (typeof input === "string") {
    const k = input.trim().toLowerCase();
    if ((USE_WITH_VALUES as readonly string[]).includes(k)) return k as UseWith;
  }
  return "both";
}

/**
 * Mongo match clause for a browse filter on useWith. A prompt tagged "both" is
 * usable everywhere, so filtering by "chat" or "agent" includes "both" too.
 * Returns undefined for "both"/invalid (no narrowing → show everything).
 */
export function useWithFilter(input: unknown): { $in: UseWith[] } | undefined {
  const v = resolveUseWith(input);
  if (v === "both") return undefined;
  return { $in: [v, "both"] };
}

/** Display label + emoji for the UI badge/selector. */
export function useWithLabel(v: UseWith): string {
  switch (v) {
    case "chat":
      return "💬 Web chat";
    case "agent":
      return "🤖 Coding agents";
    case "both":
    default:
      return "↔️ Chat & agents";
  }
}
