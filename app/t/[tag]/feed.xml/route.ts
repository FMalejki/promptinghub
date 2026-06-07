import { getDb } from "@/lib/db";
import { buildRssFeed, tagRssChannel, type RssPrompt } from "@/lib/rss";
import { normalizeTags } from "@/lib/tags";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const revalidate = 3600; // refresh hourly

// Per-tag RSS feed: public prompts carrying the tag, newest first. DB-safe.
export async function GET(_req: Request, { params }: { params: { tag: string } }) {
  const tag = normalizeTags([decodeURIComponent(params.tag)])[0] || params.tag;
  let prompts: RssPrompt[] = [];

  try {
    const db = await getDb();
    const rows = await db
      .collection("prompts")
      .aggregate([
        { $match: { tags: tag, isPrivate: { $ne: true } } },
        { $sort: { createdAt: -1, _id: -1 } },
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

  const xml = buildRssFeed(SITE_URL, prompts, tagRssChannel(tag));
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
