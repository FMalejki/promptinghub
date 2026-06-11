import { Db } from "mongodb";
import { normalizeTags } from "./tags";
import type { Prompt } from "./prompts";

// Following a tag: a user subscribes to a topic and gets a feed of public
// prompts carrying any of their followed tags. Tags are normalized (the same
// way prompt tags are) so "SEO", " seo " and "seo" are one subscription.

function norm(tag: string): string | null {
  return normalizeTags([tag])[0] ?? null;
}

export async function followTag(db: Db, followerEmail: string, tag: string): Promise<boolean> {
  const t = norm(tag);
  if (!t) return false;
  const res = await db.collection("tagFollows").updateOne(
    { followerEmail, tag: t },
    { $setOnInsert: { followerEmail, tag: t, createdAt: new Date() } },
    { upsert: true },
  );
  return res.upsertedCount > 0;
}

export async function unfollowTag(db: Db, followerEmail: string, tag: string): Promise<boolean> {
  const t = norm(tag);
  if (!t) return false;
  const res = await db.collection("tagFollows").deleteOne({ followerEmail, tag: t });
  return res.deletedCount > 0;
}

export async function isFollowingTag(db: Db, followerEmail: string, tag: string): Promise<boolean> {
  const t = norm(tag);
  if (!t) return false;
  return !!(await db.collection("tagFollows").findOne({ followerEmail, tag: t }));
}

export async function listFollowedTags(db: Db, followerEmail: string): Promise<string[]> {
  const rows = await db.collection("tagFollows").find({ followerEmail }).toArray();
  return rows.map((r) => r.tag as string);
}

// Public prompts tagged with any of the viewer's followed tags, newest first.
export async function tagFeed(db: Db, followerEmail: string, limit = 50): Promise<Prompt[]> {
  const tags = await listFollowedTags(db, followerEmail);
  if (!tags.length) return [];

  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: { tags: { $in: tags }, isPrivate: { $ne: true } } },
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
    author: { name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null, handle: r.u?.handle ?? null },
  }));
}
