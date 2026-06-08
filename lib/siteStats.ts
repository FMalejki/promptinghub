import { Db } from "mongodb";

// Public platform totals for social proof: number of public prompts, distinct
// authors with a public prompt, and total copies across them. Private prompts
// are excluded everywhere.
export type SiteStats = { prompts: number; creators: number; copies: number };

export async function siteStats(db: Db): Promise<SiteStats> {
  const match = { isPrivate: { $ne: true } };
  const [prompts, creators, copyAgg] = await Promise.all([
    db.collection("prompts").countDocuments(match),
    db.collection("prompts").distinct("ownerEmail", match),
    db
      .collection("prompts")
      .aggregate([{ $match: match }, { $group: { _id: null, copies: { $sum: { $ifNull: ["$copyCount", 0] } } } }])
      .toArray(),
  ]);

  return {
    prompts,
    creators: creators.length,
    copies: (copyAgg[0]?.copies as number) || 0,
  };
}
