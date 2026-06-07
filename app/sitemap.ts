import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { buildSitemapEntries, type SitemapPrompt } from "@/lib/sitemap";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const revalidate = 3600; // refresh hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let prompts: SitemapPrompt[] = [];
  try {
    const db = await getDb();
    const rows = await db
      .collection("prompts")
      .aggregate([
        { $match: { isPrivate: { $ne: true } } },
        { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
        { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
        { $project: { slug: 1, createdAt: 1, "u.handle": 1 } },
      ])
      .toArray();
    prompts = rows.map((r: any) => ({
      id: r._id.toString(),
      handle: r.u?.handle,
      slug: r.slug,
      isPrivate: false,
      createdAt: r.createdAt,
    }));
  } catch {
    // DB unavailable at build/request time — still emit the static pages.
  }
  return buildSitemapEntries(SITE_URL, prompts);
}
