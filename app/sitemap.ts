import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { buildSitemapEntries, type SitemapPrompt, type SitemapExtras } from "@/lib/sitemap";
import { topTags } from "@/lib/prompts";
import { listPublicCollections } from "@/lib/collections";
import { topCreators } from "@/lib/users";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const revalidate = 3600; // refresh hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let prompts: SitemapPrompt[] = [];
  let extras: SitemapExtras = {};
  try {
    const db = await getDb();
    const [rows, tags, collections, creators] = await Promise.all([
      db
        .collection("prompts")
        .aggregate([
          { $match: { isPrivate: { $ne: true } } },
          { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
          { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
          { $project: { slug: 1, createdAt: 1, "u.handle": 1 } },
        ])
        .toArray(),
      topTags(db, 100),
      listPublicCollections(db).catch(() => []),
      topCreators(db, 100).catch(() => []),
    ]);
    prompts = rows.map((r: any) => ({
      id: r._id.toString(),
      handle: r.u?.handle,
      slug: r.slug,
      isPrivate: false,
      createdAt: r.createdAt,
    }));
    extras = {
      tags: tags.map((t) => t.tag),
      collections: (collections as any[]).map((c) => c.id),
      creators: (creators as any[]).map((c) => c.handle),
    };
  } catch {
    // DB unavailable at build/request time — still emit the static pages.
  }
  return buildSitemapEntries(SITE_URL, prompts, extras);
}
