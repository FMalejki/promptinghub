import { getDb } from "@/lib/db";
import { buildRssFeed, toRssPrompts, type RssPrompt } from "@/lib/rss";
import { getCollectionDetail } from "@/lib/collections";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const revalidate = 3600; // refresh hourly

// RSS feed for a single collection: its public prompts in list order.
// DB-safe and 404s for an unknown collection.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let prompts: RssPrompt[] = [];
  let name = "Collection";

  try {
    const detail = await getCollectionDetail(await getDb(), params.id);
    if (!detail) return new Response("Not found", { status: 404 });
    name = detail.name;
    prompts = toRssPrompts(detail.prompts);
  } catch {
    // DB unavailable — still return a well-formed (empty) feed.
  }

  const xml = buildRssFeed(SITE_URL, prompts, {
    title: `${name} · PromptingHub collection`,
    description: `Prompts in the “${name}” collection on PromptingHub.`,
    selfPath: `/collections/${params.id}/feed.xml`,
    link: `/collections/${params.id}`,
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
