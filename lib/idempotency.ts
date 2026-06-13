// Pure helpers for de-duplicating soft engagement counters (views, copies).
// A counter should reflect *people*, not page refreshes or repeated clicks, so
// each (prompt, viewer) pair only counts once per time window. Kept framework-
// free so the bucketing is unit-testable; the prompts lib does the storage.

// Windows are deliberately coarse: long enough that a refresh / re-open doesn't
// re-count, short enough that a genuine return visit later still counts.
export const VIEW_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours
export const COPY_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

// Map a timestamp to the integer window index it falls in. Same window → same
// bucket → deduped. Guards against NaN / non-positive windows by returning 0.
export function timeBucket(nowMs: number, windowMs: number): number {
  if (!Number.isFinite(nowMs) || !Number.isFinite(windowMs) || windowMs <= 0) return 0;
  return Math.floor(nowMs / windowMs);
}

// Normalize a client-supplied viewer token (the anonymous localStorage id). We
// only trust a hex-ish token of sane length; anything else is treated as "no
// token" so a junk value can't collapse everyone's counts into one bucket.
export function normalizeViewer(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  return /^[A-Za-z0-9]{8,64}$/.test(s) ? s : "";
}

// Derive a stable, namespaced dedup token from a client IP. Used ONLY as a
// fallback viewer when the request carries no valid anonId, so a scripted
// no-id caller (curl) still de-duplicates per network per window instead of
// incrementing on every hit. Honest browsers always send a localStorage anonId
// and never reach this path. Returns "" for an empty/unknown IP. The "ip"
// prefix keeps it inside normalizeViewer's alnum space while making it
// impossible to collide with a real anonId.
export function ipViewerKey(ip: unknown): string {
  const s = typeof ip === "string" ? ip.trim() : "";
  if (!s || s === "unknown") return "";
  // FNV-1a → 32-bit hex. Not cryptographic — just a compact, deterministic,
  // non-identifying bucket key (we never store the raw IP).
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return "ip" + h.toString(16).padStart(8, "0");
}
