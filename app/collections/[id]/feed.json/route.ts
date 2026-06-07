import { getDb } from "@/lib/db";
import { buildJsonFeed, toRssPrompts, type RssPrompt } from "@/lib/rss";
import { getCollectionDetail } from "@/lib/collections";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const revalidate = 3600; // refresh hourly

// JSON Feed 1.1 for a single collection: its public prompts in list order.
// DB-safe and 404s for an unknown collection.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let prompts: RssPrompt[] = [];
  let name = "Collection";

  try {
    const detail = await getCollectionDetail(await getDb(), params.id);
    if (!detail) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    name = detail.name;
    prompts = toRssPrompts(detail.prompts);
  } catch {
    // DB unavailable — still return a well-formed (empty) feed.
  }

  const feed = buildJsonFeed(SITE_URL, prompts, {
    title: `${name} · PromptingHub collection`,
    description: `Prompts in the “${name}” collection on PromptingHub.`,
    selfPath: `/collections/${params.id}/feed.json`,
    link: `/collections/${params.id}`,
  });
  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
