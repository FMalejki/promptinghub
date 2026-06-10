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
