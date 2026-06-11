// Shared shapes + pure helpers for the community model-attestation UI.
// Kept framework-free so the add/neutral logic is unit-testable without RTL.

export type Vote = "works" | "broken" | "mixed";

export type ModelSummary = {
  modelId: string;
  works: number;
  broken: number;
  mixed: number;
  youVoted: Vote | null;
};

/**
 * Reveal a model row *without* presupposing a verdict.
 *
 * Adding a model used to hardcode a "works" vote (the old "It works" button),
 * which confused users: they'd add a model and it would already be marked as
 * working before they chose Works/Mixed/No. Instead we insert a neutral row
 * (zero counts, no vote) so the user picks the verdict afterwards — and only
 * that pick is what actually persists to the server.
 *
 * Returns the original array unchanged when `modelId` is empty or already listed
 * (no duplicates), so it's safe to call optimistically.
 */
export function addNeutralModel(models: ModelSummary[], modelId: string): ModelSummary[] {
  if (!modelId) return models;
  if (models.some((m) => m.modelId === modelId)) return models;
  return [...models, { modelId, works: 0, broken: 0, mixed: 0, youVoted: null }];
}

// Compact community-attestation signal for a prompt CARD (browse/list). Folds the
// per-model summaries into one headline verdict + counts so a card can show e.g.
// "✓ Works 4" without the full per-model widget. Pure → unit-testable + client-safe.
export type CardAttestation = {
  verdict: Vote; // dominant community verdict (works > mixed > broken on ties)
  works: number;
  mixed: number;
  broken: number;
  models: number; // how many distinct models have at least one vote
};

export function summarizeCardAttestation(summaries: ModelSummary[]): CardAttestation | null {
  let works = 0;
  let mixed = 0;
  let broken = 0;
  let models = 0;
  for (const s of summaries) {
    const total = s.works + s.mixed + s.broken;
    if (total === 0) continue; // neutral/unvoted rows don't count
    models++;
    works += s.works;
    mixed += s.mixed;
    broken += s.broken;
  }
  if (works + mixed + broken === 0) return null; // no community signal at all
  // Dominant verdict, ties favour the more positive outcome (works > mixed > broken).
  let verdict: Vote = "works";
  if (broken > works && broken > mixed) verdict = "broken";
  else if (mixed > works && mixed >= broken) verdict = "mixed";
  return { verdict, works, mixed, broken, models };
}
