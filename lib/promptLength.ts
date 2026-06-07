// Map a prompt's token estimate to a coarse Short / Medium / Long badge.
// Returns null when there's nothing meaningful to show (0 / missing / negative).

export type LengthBadge = { label: "Short" | "Medium" | "Long"; tokens: number };

export function lengthLabel(tokens: number | undefined): LengthBadge | null {
  if (!tokens || tokens <= 0) return null;
  const label = tokens <= 150 ? "Short" : tokens <= 600 ? "Medium" : "Long";
  return { label, tokens };
}
