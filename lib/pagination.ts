// Tiny pure helpers for offset/limit pagination of list endpoints. Pagination is
// opt-in: a request without a `limit` returns the full pool (so existing callers
// and the unpaginated browse fallback are unaffected).

export const MAX_PAGE_SIZE = 100;

// A positive, capped page size, or undefined when absent/invalid (→ no pagination).
export function parseLimit(raw: string | null): number | undefined {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

// A non-negative offset; 0 for absent/invalid/negative.
export function parseOffset(raw: string | null): number {
  const n = Number(raw);
  return raw && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// The offset for the next page, or null when this looks like the last one. Uses
// the "page came back full → assume more" heuristic; a short page ends paging.
export function nextOffset(returned: number, limit: number | undefined, offset: number): number | null {
  if (!limit) return null;
  return returned >= limit ? offset + returned : null;
}
