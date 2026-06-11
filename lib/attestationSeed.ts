// Deterministic, idempotent "looks alive" COMMUNITY attestations for seeded prompts.
// Given a prompt id, the models it lists, and a pool of persona emails, pick a stable
// set of personas to vote works/mixed/broken on a couple of those models — so the
// ✓Works/~Mixed/✗Issues card badge actually shows up on real persona/curated content.
//
// Same rule as the engagement seed (ns/215): the CALLER must only pass persona-owned
// prompts + persona voters. This module never decides who is "real"; it just produces
// a deterministic vote list. Pure + client-safe (no mongodb) so it unit-tests cleanly.

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

export type Vote = "works" | "mixed" | "broken";
export type SeededAttestation = { email: string; modelId: string; vote: Vote };

// Models that aren't a real target for a "does it work" vote.
const SKIP_MODELS = new Set(["other", ""]);
// Fallback models when a prompt lists none real — the two most common chat models.
export const FALLBACK_MODELS = ["gpt-4o", "claude-3.5-sonnet"];

// A realistic vote: mostly works, some mixed, occasionally broken (NOT all-works,
// which would look as fake as a flat star count).
function voteFor(r: number): Vote {
  if (r < 0.7) return "works";
  if (r < 0.92) return "mixed";
  return "broken";
}

/**
 * Deterministic community attestations for one prompt. Picks 1–2 of the prompt's
 * models, then a stable long-tail subset of personas to vote on each. Same inputs →
 * same output. Returns [] when there are no personas to vote.
 */
export function attestationsFor(
  promptId: string,
  modelIds: string[],
  personaEmails: string[],
  opts: { maxPerModel?: number; maxModels?: number } = {},
): SeededAttestation[] {
  const emails = personaEmails.filter(Boolean);
  if (!emails.length) return [];
  const maxPerModel = Math.min(opts.maxPerModel ?? 5, emails.length);
  const maxModels = opts.maxModels ?? 2;

  // Candidate models: the prompt's real models, else the common fallback.
  const real = Array.from(new Set(modelIds.filter((m) => m && !SKIP_MODELS.has(m))));
  const candidates = real.length ? real : FALLBACK_MODELS;
  // Deterministically order + cap how many models get community votes.
  const models = [...candidates]
    .sort((a, b) => hash(promptId + "|m|" + a) - hash(promptId + "|m|" + b))
    .slice(0, maxModels);

  const out: SeededAttestation[] = [];
  for (const modelId of models) {
    const rng = mulberry32(hash(promptId + "|" + modelId));
    const n = Math.floor(rng() * rng() * (maxPerModel + 1)); // long-tail skew
    const voters = [...emails]
      .sort((a, b) => hash(promptId + "|" + modelId + "|" + a) - hash(promptId + "|" + modelId + "|" + b))
      .slice(0, n);
    for (const email of voters) {
      const vr = mulberry32(hash(promptId + "|" + modelId + "|" + email + "|v"))();
      out.push({ email, modelId, vote: voteFor(vr) });
    }
  }
  return out;
}
