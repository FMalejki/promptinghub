import { Db } from "mongodb";
import { getUserByHandle } from "./users";
import { addNotification, actorName } from "./notifications";
import type { Prompt } from "./prompts";

// Resolve a target creator's email from their handle. Null if unknown.
async function emailForHandle(db: Db, handle: string): Promise<string | null> {
  const u = await getUserByHandle(db, handle);
  return u?.email ?? null;
}

// Follow a creator by handle. Idempotent; refuses self-follow and unknown handles.
export async function followCreator(db: Db, followerEmail: string, targetHandle: string): Promise<boolean> {
  const targetEmail = await emailForHandle(db, targetHandle);
  if (!targetEmail || targetEmail === followerEmail) return false;
  const res = await db.collection("follows").updateOne(
    { followerEmail, targetEmail },
    { $setOnInsert: { followerEmail, targetEmail, createdAt: new Date() } },
    { upsert: true },
  );
  // Notify the followed creator, but only on a brand-new follow.
  if (res.upsertedCount) {
    try {
      await addNotification(db, { recipientEmail: targetEmail, type: "follow", actorEmail: followerEmail, actorName: await actorName(db, followerEmail) });
    } catch {
      /* notifications are best-effort */
    }
  }
  return true;
}

export async function unfollowCreator(db: Db, followerEmail: string, targetHandle: string): Promise<boolean> {
  const targetEmail = await emailForHandle(db, targetHandle);
  if (!targetEmail) return false;
  await db.collection("follows").deleteOne({ followerEmail, targetEmail });
  return true;
}

export async function isFollowing(db: Db, followerEmail: string, targetHandle: string): Promise<boolean> {
  const targetEmail = await emailForHandle(db, targetHandle);
  if (!targetEmail) return false;
  return !!(await db.collection("follows").findOne({ followerEmail, targetEmail }));
}

export async function countFollowers(db: Db, targetHandle: string): Promise<number> {
  const targetEmail = await emailForHandle(db, targetHandle);
  if (!targetEmail) return 0;
  return db.collection("follows").countDocuments({ targetEmail });
}

// Handles of everyone `followerEmail` follows (for display + feed building).
export async function listFollowingHandles(db: Db, followerEmail: string): Promise<string[]> {
  const rows = await db.collection("follows").find({ followerEmail }).toArray();
  const emails = rows.map((r) => r.targetEmail);
  if (!emails.length) return [];
  const users = await db.collection("users").find({ email: { $in: emails } }).toArray();
  return users.map((u) => u.handle).filter((h): h is string => typeof h === "string");
}

// Public prompts from everyone `followerEmail` follows, newest first.
export async function followingFeed(db: Db, followerEmail: string, limit = 50): Promise<Prompt[]> {
  const follows = await db.collection("follows").find({ followerEmail }).toArray();
  const emails = follows.map((f) => f.targetEmail);
  if (!emails.length) return [];

  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: { ownerEmail: { $in: emails }, isPrivate: { $ne: true } } },
      { $addFields: { stars: { $size: { $ifNull: ["$starredBy", []] } }, copyCount: { $ifNull: ["$copyCount", 0] } } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit },
      { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
      { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();

  return rows.map((r: any) => ({
    id: r._id.toString(),
    name: r.name,
    description: r.description,
    category: r.category,
    image: r.image ?? null,
    stars: r.stars || 0,
    isPrivate: r.isPrivate || false,
    testedModels: r.testedModels || [],
    copyCount: r.copyCount || 0,
    priceCents: r.priceCents || 0,
    tags: r.tags || [],
    createdAt: r.createdAt,
    author: { email: r.ownerEmail, name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null },
  }));
}
