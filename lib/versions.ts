import { Db } from "mongodb";
import { normalizeFiles, updatePrompt, type PromptFile } from "./prompts";

export type PromptVersion = {
  version: number;
  name: string;
  body: string;
  files: PromptFile[] | null;
  createdAt: Date;
};

// Snapshot a prompt's current (about-to-be-replaced) state. Called by updatePrompt
// before applying an edit, so each version captures the PRIOR content.
export async function snapshotVersion(
  db: Db,
  promptId: string,
  prior: { name: string; body?: string; files?: PromptFile[] | null }
): Promise<void> {
  const version = (await db.collection("promptVersions").countDocuments({ promptId })) + 1;
  await db.collection("promptVersions").insertOne({
    promptId,
    version,
    name: prior.name,
    body: prior.body ?? "",
    files: prior.files ?? null,
    createdAt: new Date(),
  });
}

// Version history for a prompt, newest-first.
export async function listVersions(db: Db, promptId: string): Promise<PromptVersion[]> {
  const rows = await db.collection("promptVersions").find({ promptId }).sort({ version: -1 }).toArray();
  return rows.map((r) => ({
    version: r.version,
    name: r.name,
    body: r.body ?? "",
    files: r.files ? normalizeFiles({ files: r.files }) : null,
    createdAt: r.createdAt,
  }));
}

// Restore a past version as the current content (owner-scoped). The pre-restore
// state is itself snapshotted (via updatePrompt), so restores are reversible.
// Returns false for a non-owner or an unknown version.
export async function restoreVersion(db: Db, promptId: string, ownerEmail: string, version: number): Promise<boolean> {
  const row = await db.collection("promptVersions").findOne({ promptId, version });
  if (!row) return false;
  if (row.files) {
    const files = normalizeFiles({ files: row.files });
    return updatePrompt(db, promptId, ownerEmail, { name: row.name, files });
  }
  return updatePrompt(db, promptId, ownerEmail, { name: row.name, body: row.body ?? "" });
}
