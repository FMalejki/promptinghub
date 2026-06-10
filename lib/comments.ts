import { Db, ObjectId } from "mongodb";
import { addNotification, actorName, NotificationType } from "./notifications";
import { extractMentions } from "./mentions";

export type Author = { name: string; image: string | null; handle: string | null };
export type Comment = {
  id: string;
  promptId: string;
  body: string;
  author: Author;
  parentId: string | null;
  edited: boolean;
  createdAt: Date;
  // Server-computed: did the viewer write this comment? Replaces client-side email
  // comparison (we no longer expose author.email).
  mine: boolean;
};

// Authors may edit their own comment for a short window after posting.
export const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export type EditResult = "ok" | "not_owner" | "empty" | "expired" | "not_found";

// Add a comment to a prompt, optionally as a reply to another comment (parentId).
// Throws on empty/whitespace body. Emits best-effort notifications to the prompt
// owner, the parent comment's author (replies), and any @mentioned handles —
// each recipient at most once, never the author themselves.
export async function addComment(
  db: Db,
  promptId: string,
  authorEmail: string,
  body: string,
  parentId?: string | null,
): Promise<{ id: string }> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment body is required");
  const parent = parentId && ObjectId.isValid(parentId) ? parentId : null;
  const doc = { promptId, authorEmail, body: trimmed.slice(0, 2000), parentId: parent, createdAt: new Date() };
  const { insertedId } = await db.collection("comments").insertOne(doc);

  // Notifications — best-effort, deduped per recipient (author never notified).
  try {
    const notified = new Set<string>([authorEmail]);
    const who = await actorName(db, authorEmail);
    const snippet = trimmed.slice(0, 140);
    let promptName: string | undefined;

    const notify = async (recipientEmail: string | undefined | null, type: NotificationType) => {
      if (!recipientEmail || notified.has(recipientEmail)) return;
      notified.add(recipientEmail);
      await addNotification(db, { recipientEmail, type, actorEmail: authorEmail, actorName: who, promptId, promptName, text: snippet });
    };

    const prompt = ObjectId.isValid(promptId)
      ? await db.collection("prompts").findOne({ _id: new ObjectId(promptId) }, { projection: { ownerEmail: 1, name: 1 } })
      : null;
    promptName = prompt?.name;

    // Reply author first (more specific than the prompt owner).
    if (parent) {
      const parentRow = await db.collection("comments").findOne({ _id: new ObjectId(parent) }, { projection: { authorEmail: 1 } });
      await notify(parentRow?.authorEmail, "reply");
    }
    await notify(prompt?.ownerEmail, "comment");

    // @mentions → resolve handles to emails and notify.
    const handles = extractMentions(trimmed);
    if (handles.length) {
      const users = await db.collection("users").find({ handle: { $in: handles } }, { projection: { email: 1 } }).toArray();
      for (const u of users) await notify(u.email, "mention");
    }
  } catch {
    /* notifications are best-effort */
  }
  return { id: insertedId.toString() };
}

// Comments for a prompt, newest-first, with author profile resolved.
export async function listComments(db: Db, promptId: string, viewerEmail?: string | null): Promise<Comment[]> {
  const rows = await db.collection("comments").find({ promptId }).sort({ createdAt: -1, _id: -1 }).toArray();
  const emails = [...new Set(rows.map((r) => r.authorEmail))];
  const users = await db.collection("users").find({ email: { $in: emails } }).toArray();
  const byEmail = new Map(users.map((u) => [u.email, u]));
  return rows.map((r) => {
    const u = byEmail.get(r.authorEmail);
    return {
      id: r._id.toString(),
      promptId: r.promptId,
      body: r.body,
      author: { name: u?.name || r.authorEmail.split("@")[0], image: u?.image ?? null, handle: u?.handle ?? null },
      parentId: r.parentId ?? null,
      edited: !!r.editedAt,
      createdAt: r.createdAt,
      mine: !!viewerEmail && r.authorEmail === viewerEmail,
    };
  });
}

// Delete a comment — only its author may. Returns false for a malformed id or non-author.
// Edit a comment's body. Author-only and only within EDIT_WINDOW_MS of posting.
// `now` is injectable for deterministic tests.
export async function editComment(
  db: Db,
  id: string,
  authorEmail: string,
  body: string,
  now: Date = new Date(),
): Promise<EditResult> {
  if (!ObjectId.isValid(id)) return "not_found";
  const trimmed = body.trim();
  if (!trimmed) return "empty";
  const row = await db.collection("comments").findOne({ _id: new ObjectId(id) });
  if (!row) return "not_found";
  if (row.authorEmail !== authorEmail) return "not_owner";
  if (now.getTime() - new Date(row.createdAt).getTime() > EDIT_WINDOW_MS) return "expired";
  await db.collection("comments").updateOne({ _id: row._id }, { $set: { body: trimmed.slice(0, 2000), editedAt: now } });
  return "ok";
}

export async function deleteComment(db: Db, id: string, authorEmail: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await db.collection("comments").deleteOne({ _id: new ObjectId(id), authorEmail });
  return res.deletedCount > 0;
}

export async function countComments(db: Db, promptId: string): Promise<number> {
  return db.collection("comments").countDocuments({ promptId });
}
