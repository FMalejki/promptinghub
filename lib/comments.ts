import { Db, ObjectId } from "mongodb";

export type Author = { email: string; name: string; image: string | null };
export type Comment = {
  id: string;
  promptId: string;
  body: string;
  author: Author;
  createdAt: Date;
};

// Add a comment to a prompt. Throws on empty/whitespace body.
export async function addComment(db: Db, promptId: string, authorEmail: string, body: string): Promise<{ id: string }> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment body is required");
  const doc = { promptId, authorEmail, body: trimmed.slice(0, 2000), createdAt: new Date() };
  const { insertedId } = await db.collection("comments").insertOne(doc);
  return { id: insertedId.toString() };
}

// Comments for a prompt, newest-first, with author profile resolved.
export async function listComments(db: Db, promptId: string): Promise<Comment[]> {
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
      author: { email: r.authorEmail, name: u?.name || r.authorEmail.split("@")[0], image: u?.image ?? null },
      createdAt: r.createdAt,
    };
  });
}

// Delete a comment — only its author may. Returns false for a malformed id or non-author.
export async function deleteComment(db: Db, id: string, authorEmail: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await db.collection("comments").deleteOne({ _id: new ObjectId(id), authorEmail });
  return res.deletedCount > 0;
}

export async function countComments(db: Db, promptId: string): Promise<number> {
  return db.collection("comments").countDocuments({ promptId });
}
