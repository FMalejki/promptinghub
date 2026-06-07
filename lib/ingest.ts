import { Db } from "mongodb";
import { createHash } from "crypto";
import type { PromptSource } from "./sources/twitter";

export type IngestResult = { enabled: boolean; imported: number };

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
