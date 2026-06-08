import { getDb } from "@/lib/db";
import { buildRssFeed, type RssPrompt } from "@/lib/rss";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const revalidate = 3600; // refresh hourly

// RSS 2.0 feed of trending public prompts. DB-safe: emits an empty channel if the DB is unavailable.
export async function GET() {
  let prompts: RssPrompt[] = [];
  try {
    const db = await getDb();
    const rows = await db
      .collection("prompts")
      .aggregate([
        { $match: { isPrivate: { $ne: true } } },
        {
          $addFields: {
            trendingScore: { $add: [{ $ifNull: ["$copyCount", 0] }, { $size: { $ifNull: ["$starredBy", []] } }] },
          },
        },
        { $sort: { trendingScore: -1, createdAt: -1 } },
        { $limit: 50 },
        { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
        { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
        { $project: { name: 1, description: 1, slug: 1, createdAt: 1, "u.handle": 1 } },
      ])
      .toArray();
    prompts = rows.map((r: any) => ({
      id: r._id.toString(),
      name: r.name,
      description: r.description,
      handle: r.u?.handle,
      slug: r.slug,
      createdAt: r.createdAt,
    }));
  } catch {
    // DB unavailable — still return a well-formed (empty) feed.
  }
  const xml = buildRssFeed(SITE_URL, prompts);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
