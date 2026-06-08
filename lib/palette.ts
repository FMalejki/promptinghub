// Wrap-around index movement for keyboard navigation in a list. Returns -1 for
// an empty list (no selection).
export function nextIndex(current: number, length: number, delta: number): number {
  if (length <= 0) return -1;
  return (((current + delta) % length) + length) % length;
}
