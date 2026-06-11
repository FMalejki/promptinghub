// Pure, client-safe reaction logic (no DB import) so it can be shared by the
// server module (lib/commentReactions.ts) AND the client (app/Comments.tsx)
// without dragging mongodb into the browser bundle.

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type ReactionState = {
  // emoji → count, only emojis with at least one reaction are present.
  counts: Record<string, number>;
  // the emojis the viewer has reacted with (subset of REACTION_EMOJIS).
  mine: string[];
};

/** Only a fixed allowlisted emoji set is accepted. */
export function isAllowedReaction(emoji: unknown): emoji is ReactionEmoji {
  return typeof emoji === "string" && (REACTION_EMOJIS as readonly string[]).includes(emoji);
}

type Row = { commentId: string; email: string; emoji: string };

/**
 * Pure aggregation: fold raw reaction rows into per-comment state. Ignores rows
 * with a disallowed emoji. `mine` is set when a row's email matches the viewer.
 */
export function aggregateReactions(
  rows: Row[],
  commentIds: string[],
  viewerEmail?: string,
): Record<string, ReactionState> {
  const out: Record<string, ReactionState> = {};
  for (const id of commentIds) out[id] = { counts: {}, mine: [] };
  for (const r of rows) {
    if (!isAllowedReaction(r.emoji)) continue;
    const s = out[r.commentId];
    if (!s) continue;
    s.counts[r.emoji] = (s.counts[r.emoji] || 0) + 1;
    if (viewerEmail && r.email === viewerEmail && !s.mine.includes(r.emoji)) s.mine.push(r.emoji);
  }
  return out;
}
