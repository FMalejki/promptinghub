import { Db, ObjectId } from "mongodb";

export type ReportResult = { ok: true } | { ok: false; error: "not_found" | "empty_reason" };

export type OpenReport = {
  id: string;
  promptId: string;
  promptName: string;
  reason: string;
  reporterEmail: string | null;
  status: "open";
  createdAt: Date;
};

// File an abuse report for a prompt. Deduped per (prompt, reporter) while open.
export async function reportPrompt(
  db: Db,
  promptId: string,
  reporterEmail: string | null,
  reason: string,
): Promise<ReportResult> {
  if (!ObjectId.isValid(promptId)) return { ok: false, error: "not_found" };
  const trimmed = (reason || "").trim();
  if (!trimmed) return { ok: false, error: "empty_reason" };
  const prompt = await db.collection("prompts").findOne({ _id: new ObjectId(promptId) }, { projection: { _id: 1 } });
  if (!prompt) return { ok: false, error: "not_found" };

  await db.collection("reports").updateOne(
    { promptId, reporterEmail, status: "open" },
    { $set: { reason: trimmed.slice(0, 1000), createdAt: new Date() }, $setOnInsert: { promptId, reporterEmail, status: "open" } },
    { upsert: true },
  );
  return { ok: true };
}

// Open reports for the moderation queue, newest first, with the prompt name resolved.
export async function listOpenReports(db: Db): Promise<OpenReport[]> {
  const rows = await db.collection("reports").find({ status: "open" }).sort({ createdAt: -1 }).toArray();
  const ids = [...new Set(rows.map((r) => r.promptId))].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const prompts = ids.length ? await db.collection("prompts").find({ _id: { $in: ids } }).toArray() : [];
  const nameById = new Map(prompts.map((p) => [p._id.toString(), p.name as string]));
  return rows.map((r) => ({
    id: r._id.toString(),
    promptId: r.promptId,
    promptName: nameById.get(r.promptId) || "(deleted prompt)",
    reason: r.reason,
    reporterEmail: r.reporterEmail ?? null,
    status: "open" as const,
    createdAt: r.createdAt,
  }));
}

// Close a report. status: "resolved" (action taken) or "dismissed" (no action).
export async function resolveReport(db: Db, id: string, status: "resolved" | "dismissed"): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await db.collection("reports").updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, resolvedAt: new Date() } },
  );
  return res.matchedCount > 0;
}
