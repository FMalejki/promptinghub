// Map a prompt's token estimate to a coarse Short / Medium / Long badge.
// Returns null when there's nothing meaningful to show (0 / missing / negative).

export type LengthBadge = { label: "Short" | "Medium" | "Long"; tokens: number };

export function lengthLabel(tokens: number | undefined): LengthBadge | null {
  if (!tokens || tokens <= 0) return null;
  const label = tokens <= 150 ? "Short" : tokens <= 600 ? "Medium" : "Long";
  return { label, tokens };
}

// Card-level variant: most prompts fall into the unremarkable "Medium" middle, so
// a chip reading "Medium" on every card is noise. Surface only the informative
// extremes — Short / Long — and show nothing for Medium.
export function cardLengthBadge(tokens: number | undefined): LengthBadge | null {
  const badge = lengthLabel(tokens);
  return badge && badge.label !== "Medium" ? badge : null;
}
