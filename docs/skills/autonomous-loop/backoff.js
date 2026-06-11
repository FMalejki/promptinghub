// Exact exponential-backoff math the SKILL refers to. Drop-in, dependency-free,
// and identical to the unit-tested lib/backoff.ts that ships with PromptingHub.
//
//   backoffDelaySeconds(BACKOFF_STATE) -> seconds to wait before the next wake
//   nextBackoffState(BACKOFF_STATE, "success" | "failure") -> updated counter
//
// Pattern: reset to 0 on a successful iteration, increment on a usage-limit /
// blocking error. Delay = min(cap, base * 2^state): 60,120,240,...,3600 (1h cap).

function backoffDelaySeconds(failureCount, { baseSeconds = 60, capSeconds = 3600 } = {}) {
  const n = Math.max(0, Math.floor(failureCount || 0));
  if (n >= 32) return capSeconds; // avoid 2^n overflow at absurd counts
  return Math.min(capSeconds, baseSeconds * 2 ** n);
}

function nextBackoffState(current, outcome) {
  const c = Math.max(0, Math.floor(current || 0));
  return outcome === "success" ? 0 : c + 1;
}

module.exports = { backoffDelaySeconds, nextBackoffState };
