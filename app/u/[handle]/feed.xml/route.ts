import { getDb } from "@/lib/db";
import { buildRssFeed, type RssPrompt } from "@/lib/rss";
import { getCreatorProfile } from "@/lib/users";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const revalidate = 3600; // refresh hourly

// Per-creator RSS feed: a creator's public prompts, newest first.
// DB-safe and 404s for an unknown handle.
export async function GET(_req: Request, { params }: { params: { handle: string } }) {
  const handle = params.handle;
  let prompts: RssPrompt[] = [];
  let name = handle;

  try {
    const db = await getDb();
    const creator = await getCreatorProfile(db, handle);
    if (!creator) return new Response("Not found", { status: 404 });
    name = creator.name || handle;

    const rows = await db
      .collection("prompts")
      .find({ ownerEmail: creator.email, isPrivate: { $ne: true } }, { projection: { name: 1, description: 1, slug: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    prompts = rows.map((r: any) => ({
      id: r._id.toString(),
      name: r.name,
      description: r.description,
      handle,
      slug: r.slug,
      createdAt: r.createdAt,
    }));
  } catch {
    // DB unavailable — still return a well-formed (empty) feed for a known-shaped path.
  }

  const xml = buildRssFeed(SITE_URL, prompts, {
    title: `${name} on PromptingHub`,
    description: `Latest public prompts from @${handle}.`,
    selfPath: `/u/${handle}/feed.xml`,
    link: `/u/${handle}`,
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
