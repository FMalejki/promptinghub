import { Db, ObjectId } from "mongodb";
import {
  REACTION_EMOJIS,
  isAllowedReaction,
  aggregateReactions,
  type ReactionEmoji,
  type ReactionState,
} from "./reactionEmojis";

// Emoji reactions for comments. One row per (commentId, email, emoji) in the
// `commentReactions` collection — same shape as commentLikes — so counts are a
// simple aggregate and "one per user per emoji" is enforced by toggling a row.
// Pure logic (allowlist, aggregation) lives in ./reactionEmojis so it can be
// imported by the client without pulling in mongodb.

export { REACTION_EMOJIS, isAllowedReaction, aggregateReactions };
export type { ReactionEmoji, ReactionState };

type Row = { commentId: string; email: string; emoji: string };

/**
 * Toggle the signed-in user's reaction with `emoji` on a comment. Returns the
 * comment's full reaction state, or null for a malformed id / disallowed emoji.
 */
export async function toggleCommentReaction(
  db: Db,
  commentId: string,
  email: string,
  emoji: string,
): Promise<ReactionState | null> {
  if (!ObjectId.isValid(commentId) || !isAllowedReaction(emoji)) return null;
  const col = db.collection("commentReactions");
  const existing = await col.findOne({ commentId, email, emoji });
  if (existing) {
    await col.deleteOne({ _id: existing._id });
  } else {
    await col.insertOne({ commentId, email, emoji, createdAt: new Date() });
  }
  const rows = (await col.find({ commentId }).toArray()) as unknown as Row[];
  return aggregateReactions(rows, [commentId], email)[commentId];
}

/** Counts + the viewer's own reactions for a batch of comment ids. */
export async function getCommentReactions(
  db: Db,
  commentIds: string[],
  viewerEmail?: string,
): Promise<Record<string, ReactionState>> {
  if (!commentIds.length) return {};
  const rows = (await db
    .collection("commentReactions")
    .find({ commentId: { $in: commentIds } })
    .toArray()) as unknown as Row[];
  return aggregateReactions(rows, commentIds, viewerEmail);
}
