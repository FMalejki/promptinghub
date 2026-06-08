import { Db, ObjectId } from "mongodb";

// Lightweight 👍 likes for comments, stored one row per (commentId, email) in
// the `commentLikes` collection so counts are a simple aggregate.

export type LikeState = { count: number; liked: boolean };

// Toggle the signed-in user's like on a comment. Returns the new state, or null
// for a malformed comment id.
export async function toggleCommentLike(db: Db, commentId: string, email: string): Promise<{ liked: boolean; count: number } | null> {
  if (!ObjectId.isValid(commentId)) return null;
  const col = db.collection("commentLikes");
  const existing = await col.findOne({ commentId, email });
  let liked: boolean;
  if (existing) {
    await col.deleteOne({ _id: existing._id });
    liked = false;
  } else {
    await col.insertOne({ commentId, email, createdAt: new Date() });
    liked = true;
  }
  const count = await col.countDocuments({ commentId });
  return { liked, count };
}

// Counts + the viewer's liked flag for a batch of comment ids.
export async function getCommentLikes(db: Db, commentIds: string[], viewerEmail?: string): Promise<Record<string, LikeState>> {
  const out: Record<string, LikeState> = {};
  if (!commentIds.length) return out;
  for (const id of commentIds) out[id] = { count: 0, liked: false };

  const rows = await db.collection("commentLikes").find({ commentId: { $in: commentIds } }).toArray();
  for (const r of rows) {
    const s = out[r.commentId];
    if (!s) continue;
    s.count += 1;
    if (viewerEmail && r.email === viewerEmail) s.liked = true;
  }
  return out;
}
