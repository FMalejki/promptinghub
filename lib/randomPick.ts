// Pick a random element from a list. `rand` is injectable (defaults to
// Math.random) so the choice is deterministic in tests. Returns null when empty.
export function pickRandom<T>(items: T[], rand: () => number = Math.random): T | null {
  if (items.length === 0) return null;
  const idx = Math.min(items.length - 1, Math.floor(rand() * items.length));
  return items[idx];
}
