// Pure exponential-backoff math for an autonomous /loop: how long to wait before
// the next iteration after N consecutive failures, and how the failure counter
// (BACKOFF_STATE) evolves. Network-free and deterministic so it unit-tests cleanly
// and can be reused by any self-pacing agent loop.

export type BackoffOpts = {
  /** Delay for the first attempt / after a success (failureCount = 0). Default 60s. */
  baseSeconds?: number;
  /** Hard ceiling — the delay never exceeds this. Default 3600s (1h). */
  capSeconds?: number;
};

/**
 * Exponential backoff with a hard cap: `min(cap, base * 2^failureCount)`.
 *
 * `failureCount` is the number of CONSECUTIVE failures so far — 0 means the next
 * run is the first attempt (or the prior run succeeded), so it returns `base`.
 * Fractional/negative inputs are floored to a non-negative integer. The exponent
 * is clamped so very large counts can't overflow — they just pin to `cap`.
 */
export function backoffDelaySeconds(failureCount: number, opts: BackoffOpts = {}): number {
  const base = opts.baseSeconds ?? 60;
  const cap = opts.capSeconds ?? 3600;
  const n = Math.max(0, Math.floor(failureCount || 0));
  if (n >= 32) return cap; // 2^32 already dwarfs any sane cap — avoid overflow
  return Math.min(cap, base * 2 ** n);
}

/**
 * Evolve BACKOFF_STATE after an iteration: reset to 0 on success, increment on
 * failure. Keeps the counter non-negative and integral.
 */
export function nextBackoffState(current: number, outcome: "success" | "failure"): number {
  const c = Math.max(0, Math.floor(current || 0));
  return outcome === "success" ? 0 : c + 1;
}
