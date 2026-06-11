// Deterministic, idempotent "looks alive" engagement for seeded prompts: given a
// prompt id and a pool of persona emails, pick a stable subset to have "starred"
// it plus a correlated copy count. Pure + seedable so it unit-tests cleanly and a
// re-run produces the SAME result (the seed script unions these with any real
// stars and takes max() of copy counts, so real engagement is never reduced).

// FNV-1a hash → uint32. Stable across runs (no Date/Math.random).
function hash(s: string): number {
  let x = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619) >>> 0;
  }
  return x >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Engagement = { starrers: string[]; copies: number };

/**
 * Deterministic engagement for one prompt. `nStars` is skewed low (rng*rng) so
 * most prompts get a few stars and a handful get many — a realistic long tail,
 * not a flat fake. `copies` correlates with stars. Same inputs → same output.
 */
export function engagementFor(
  promptId: string,
  personaEmails: string[],
  opts: { maxStars?: number } = {},
): Engagement {
  const emails = personaEmails.filter(Boolean);
  if (!emails.length) return { starrers: [], copies: 0 };
  const maxStars = Math.min(opts.maxStars ?? 14, emails.length);
  const rng = mulberry32(hash(promptId));
  const nStars = Math.floor(rng() * rng() * (maxStars + 1)); // long-tail skew
  // Deterministic per-prompt ordering of the persona pool, then take the top n.
  const starrers = [...emails]
    .sort((a, b) => hash(promptId + "|" + a) - hash(promptId + "|" + b))
    .slice(0, nStars);
  // Copies ≥ stars, with a little spread so it isn't a fixed ratio.
  const copies = nStars === 0 ? (rng() < 0.4 ? Math.floor(rng() * 3) : 0) : Math.round(nStars * (1 + rng() * 2.5));
  return { starrers, copies };
}
