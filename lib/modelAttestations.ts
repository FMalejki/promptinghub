import { Db } from "mongodb";

// Community model attestations: any signed-in user can confirm (works) or deny
// (broken) that a prompt works on a given model, and add models the author never
// listed. One vote per (prompt, model, user); re-voting replaces it.

// "works" = confirmed working, "broken" = doesn't work, "mixed" = works partially /
// inconsistently (sometimes good, sometimes off).
export type Vote = "works" | "broken" | "mixed";
export type AttestationRow = { modelId: string; email: string; vote: Vote };
export type ModelSummary = { modelId: string; works: number; broken: number; mixed: number; youVoted: Vote | null };

export function isValidVote(v: unknown): v is Vote {
  return v === "works" || v === "broken" || v === "mixed";
}

// Pure: fold raw rows into per-model counts + the viewer's own vote, ordered by
// total attestations (most-tested first).
export function aggregateAttestations(rows: AttestationRow[], viewerEmail?: string | null): ModelSummary[] {
  const map = new Map<string, ModelSummary>();
  for (const r of rows) {
    let s = map.get(r.modelId);
    if (!s) {
      s = { modelId: r.modelId, works: 0, broken: 0, mixed: 0, youVoted: null };
      map.set(r.modelId, s);
    }
    if (r.vote === "works") s.works++;
    else if (r.vote === "broken") s.broken++;
    else if (r.vote === "mixed") s.mixed++;
    if (viewerEmail && r.email === viewerEmail) s.youVoted = r.vote;
  }
  const total = (m: ModelSummary) => m.works + m.broken + m.mixed;
  return [...map.values()].sort(
    (a, b) => total(b) - total(a) || a.modelId.localeCompare(b.modelId),
  );
}

const COL = "modelAttestations";

export async function attestModel(db: Db, promptId: string, email: string, modelId: string, vote: Vote): Promise<void> {
  await db.collection(COL).updateOne(
    { promptId, email, modelId },
    { $set: { vote, updatedAt: new Date() }, $setOnInsert: { promptId, email, modelId, createdAt: new Date() } },
    { upsert: true },
  );
}

export async function removeAttestation(db: Db, promptId: string, email: string, modelId: string): Promise<void> {
  await db.collection(COL).deleteOne({ promptId, email, modelId });
}

export async function listAttestations(db: Db, promptId: string): Promise<AttestationRow[]> {
  const rows = await db.collection(COL).find({ promptId }).toArray();
  return rows.map((r: any) => ({ modelId: r.modelId, email: r.email, vote: r.vote }));
}

// Convenience: the aggregated summary for a prompt, with the viewer's votes marked.
export async function getModelSummary(db: Db, promptId: string, viewerEmail?: string | null): Promise<ModelSummary[]> {
  return aggregateAttestations(await listAttestations(db, promptId), viewerEmail);
}
