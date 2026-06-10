import { Db } from "mongodb";

// Lightweight product-feedback channel (distinct from prompt/comment "reports",
// which are moderation flags). Anyone can send feedback; signed-in users are
// attributed by email. `simulated` marks synthetic/persona feedback so it can be
// filtered out of real triage.
export const FEEDBACK_CATEGORIES = ["bug", "idea", "confusing", "praise", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export type FeedbackInput = {
  message: string;
  category?: string;
  email?: string | null;
  page?: string | null;
  simulated?: boolean;
};

export type FeedbackRow = {
  id: string;
  message: string;
  category: FeedbackCategory;
  email: string | null;
  page: string | null;
  simulated: boolean;
  status: "open" | "triaged";
  createdAt: Date;
};

export function normalizeCategory(c: unknown): FeedbackCategory {
  return (FEEDBACK_CATEGORIES as readonly string[]).includes(c as string) ? (c as FeedbackCategory) : "other";
}

// Persist a feedback entry. Returns its id, or null when the message is empty.
export async function submitFeedback(db: Db, input: FeedbackInput): Promise<{ id: string } | null> {
  const message = (input.message || "").trim().slice(0, 2000);
  if (!message) return null;
  const doc = {
    message,
    category: normalizeCategory(input.category),
    email: input.email?.trim() || null,
    page: (input.page || "").toString().slice(0, 200) || null,
    simulated: !!input.simulated,
    status: "open" as const,
    createdAt: new Date(),
  };
  const { insertedId } = await db.collection("feedback").insertOne(doc);
  return { id: insertedId.toString() };
}

// Recent feedback for admin triage. Excludes simulated/persona feedback by default.
export async function listFeedback(
  db: Db,
  opts: { limit?: number; includeSimulated?: boolean } = {},
): Promise<FeedbackRow[]> {
  const match = opts.includeSimulated ? {} : { simulated: { $ne: true } };
  const rows = await db
    .collection("feedback")
    .find(match)
    .sort({ createdAt: -1, _id: -1 })
    .limit(Math.min(Math.max(opts.limit ?? 100, 1), 500))
    .toArray();
  return rows.map((r: any) => ({
    id: r._id.toString(),
    message: r.message,
    category: normalizeCategory(r.category),
    email: r.email ?? null,
    page: r.page ?? null,
    simulated: !!r.simulated,
    status: r.status === "triaged" ? "triaged" : "open",
    createdAt: r.createdAt,
  }));
}
