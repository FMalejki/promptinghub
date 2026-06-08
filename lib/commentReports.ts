import { Db, ObjectId } from "mongodb";

export type CommentReportResult = { ok: true } | { ok: false; error: "not_found" };

export type OpenCommentReport = {
  id: string;
  commentId: string;
  commentBody: string;
  reason: string;
  reporterEmail: string | null;
  status: "open";
  createdAt: Date;
};

const DEFAULT_REASON = "Reported as inappropriate";

// File an abuse report for a comment. Deduped per (comment, reporter) while open.
// An empty reason falls back to a default rather than being rejected.
export async function reportComment(
  db: Db,
  commentId: string,
  reporterEmail: string | null,
  reason: string,
): Promise<CommentReportResult> {
  if (!ObjectId.isValid(commentId)) return { ok: false, error: "not_found" };
  const comment = await db.collection("comments").findOne({ _id: new ObjectId(commentId) }, { projection: { _id: 1 } });
  if (!comment) return { ok: false, error: "not_found" };
  const trimmed = (reason || "").trim().slice(0, 1000) || DEFAULT_REASON;

  await db.collection("commentReports").updateOne(
    { commentId, reporterEmail, status: "open" },
    { $set: { reason: trimmed, createdAt: new Date() }, $setOnInsert: { commentId, reporterEmail, status: "open" } },
    { upsert: true },
  );
  return { ok: true };
}

// Open comment reports for the moderation queue, newest first, with the comment body resolved.
export async function listOpenCommentReports(db: Db): Promise<OpenCommentReport[]> {
  const rows = await db.collection("commentReports").find({ status: "open" }).sort({ createdAt: -1 }).toArray();
  const ids = [...new Set(rows.map((r) => r.commentId))].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const comments = ids.length ? await db.collection("comments").find({ _id: { $in: ids } }).toArray() : [];
  const bodyById = new Map(comments.map((c) => [c._id.toString(), c.body as string]));
  return rows.map((r) => ({
    id: r._id.toString(),
    commentId: r.commentId,
    commentBody: bodyById.get(r.commentId) || "(deleted comment)",
    reason: r.reason,
    reporterEmail: r.reporterEmail ?? null,
    status: "open" as const,
    createdAt: r.createdAt,
  }));
}

// Close a comment report. status: "resolved" (action taken) or "dismissed" (no action).
export async function resolveCommentReport(db: Db, id: string, status: "resolved" | "dismissed"): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await db.collection("commentReports").updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, resolvedAt: new Date() } },
  );
  return res.matchedCount > 0;
}
