import { Db, ObjectId } from "mongodb";
import { createHash } from "crypto";
import type { PromptSource } from "./sources/twitter";
import { createPrompt } from "./prompts";

export type IngestResult = { enabled: boolean; imported: number };

export type PendingDraft = {
  id: string;
  source: string;
  name: string;
  description: string;
  category: string;
  body: string;
  createdAt: Date;
};

function bodyHash(body: string): string {
  return createHash("sha256").update(body.trim()).digest("hex");
}

/**
 * Pull drafts from a source and store the new ones for human curation.
 *
 * Nothing is published — imported items land in `ingestedDrafts` with
 * `status: "pending"`. Deduped by a hash of the body so re-runs don't pile up.
 * Returns `{ enabled: false, imported: 0 }` when the source is disabled (e.g. no
 * API token), so a daily cron can call this safely and cheaply.
 */
export async function runIngest(db: Db, source: PromptSource, query: string): Promise<IngestResult> {
  const result = await source.fetchRecent(query);
  if (!result.enabled) return { enabled: false, imported: 0 };

  const col = db.collection("ingestedDrafts");
  let imported = 0;
  for (const draft of result.items) {
    const hash = bodyHash(draft.body);
    if (await col.findOne({ hash })) continue;
    await col.insertOne({
      hash,
      source: source.id,
      name: draft.name,
      description: draft.description,
      category: draft.category,
      body: draft.body,
      testedModels: draft.testedModels || [],
      status: "pending",
      createdAt: new Date(),
    });
    imported++;
  }
  return { enabled: true, imported };
}

// Pending drafts awaiting human curation, newest-first.
export async function listPendingDrafts(db: Db): Promise<PendingDraft[]> {
  const rows = await db.collection("ingestedDrafts").find({ status: "pending" }).sort({ createdAt: -1 }).toArray();
  return rows.map((r) => ({
    id: r._id.toString(),
    source: r.source,
    name: r.name,
    description: r.description,
    category: r.category,
    body: r.body,
    createdAt: r.createdAt,
  }));
}

// Approve a pending draft → publish it as a prompt owned by the curator.
// Returns the new prompt id, or null if the draft isn't pending (e.g. already handled).
export async function approveDraft(db: Db, id: string, ownerEmail: string): Promise<{ promptId: string } | null> {
  if (!ObjectId.isValid(id)) return null;
  const draft = await db.collection("ingestedDrafts").findOne({ _id: new ObjectId(id), status: "pending" });
  if (!draft) return null;
  const created = await createPrompt(db, ownerEmail, {
    name: draft.name,
    description: draft.description,
    category: draft.category,
    body: draft.body,
    testedModels: draft.testedModels || [],
  });
  await db.collection("ingestedDrafts").updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "published", publishedPromptId: created.id, publishedAt: new Date() } }
  );
  return { promptId: created.id };
}

// Dismiss a pending draft.
export async function dismissDraft(db: Db, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await db.collection("ingestedDrafts").updateOne(
    { _id: new ObjectId(id), status: "pending" },
    { $set: { status: "dismissed", dismissedAt: new Date() } }
  );
  return res.matchedCount > 0;
}
