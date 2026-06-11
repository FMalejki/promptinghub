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
 * `null` is included so LEGACY docs without a useWith field (created before this
 * field existed = effectively "both") still match — `$in: [null]` matches a
 * missing field in MongoDB. Returns undefined for "both"/invalid (no narrowing).
 */
export function useWithFilter(input: unknown): { $in: (UseWith | null)[] } | undefined {
  const v = resolveUseWith(input);
  if (v === "both") return undefined;
  return { $in: [v, "both", null] };
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

/**
 * Compact card chip for a prompt's useWith — but ONLY when it's specialized.
 * "both" (the default, and most prompts) returns null so we don't clutter every
 * card with a meaningless "works everywhere" badge. Invalid input → null too.
 */
export function useWithBadge(input: unknown): { emoji: string; label: string } | null {
  const v = resolveUseWith(input);
  if (v === "chat") return { emoji: "💬", label: "Chat" };
  if (v === "agent") return { emoji: "🤖", label: "Agents" };
  return null; // "both" → no chip
}
