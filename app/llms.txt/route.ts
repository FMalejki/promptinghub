import { getDb } from "@/lib/db";
import { buildLlmsTxt, type LlmsTxtPrompt } from "@/lib/llmsTxt";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const revalidate = 3600; // refresh hourly

// /llms.txt (llmstxt.org): a curated Markdown map of the site for AI crawlers,
// featuring the trending public prompts. DB-safe: still emits a valid document
// (with just the Resources section) if the DB is unavailable.
export async function GET() {
  let prompts: LlmsTxtPrompt[] = [];
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
        { $limit: 25 },
        { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
        { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
        { $project: { name: 1, description: 1, slug: 1, "u.handle": 1 } },
      ])
      .toArray();
    prompts = rows.map((r: any) => ({
      id: r._id.toString(),
      name: r.name,
      description: r.description,
      handle: r.u?.handle,
      slug: r.slug,
    }));
  } catch {
    // DB unavailable — still return a well-formed document.
  }

  return new Response(buildLlmsTxt(SITE_URL, prompts), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
