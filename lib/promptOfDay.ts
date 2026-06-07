// Deterministic "prompt of the day" selection. The pick is stable for a given
// UTC calendar day so every visitor sees the same one, and rotates daily.

// YYYY-MM-DD in UTC — the bucket that defines "today" for the rotation.
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// FNV-1a hash of a string → unsigned 32-bit int. Cheap, well-distributed.
function hashKey(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Pick one item deterministically for the given day. Null if the list is empty.
export function pickOfTheDay<T>(items: T[], date: Date): T | null {
  if (items.length === 0) return null;
  const idx = hashKey(dateKey(date)) % items.length;
  return items[idx];
}
