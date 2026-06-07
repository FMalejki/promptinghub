// Pure RSS 2.0 feed builder for trending prompts. No DB/Next dependencies so it
// stays unit-testable; the route layer supplies the rows.

export type RssPrompt = {
  id: string;
  name: string;
  description: string;
  handle?: string;
  slug?: string;
  createdAt?: Date;
};

// Map a list of prompt-ish rows to RSS items, dropping private ones. Handy for
// building a feed from a collection's resolved prompts.
export function toRssPrompts(
  prompts: { id: string; name: string; description: string; isPrivate?: boolean; handle?: string; slug?: string; createdAt?: Date }[],
): RssPrompt[] {
  return prompts
    .filter((p) => !p.isPrivate)
    .map((p) => ({ id: p.id, name: p.name, description: p.description, handle: p.handle, slug: p.slug, createdAt: p.createdAt }));
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function promptPath(p: RssPrompt): string {
  return p.handle && p.slug ? `/p/${p.handle}/${p.slug}` : `/prompt/${p.id}`;
}

// Optional channel overrides so the same builder powers the global trending feed
// and per-creator feeds (different title/description/self link).
export type RssChannel = { title?: string; description?: string; selfPath?: string; link?: string };

// Channel metadata for a tag's RSS feed. Tag is URL-encoded in paths (the
// human-readable title keeps the raw tag).
export function tagRssChannel(tag: string): Required<RssChannel> {
  const enc = encodeURIComponent(tag);
  return {
    title: `#${tag} on PromptingHub`,
    description: `Latest public prompts tagged #${tag}.`,
    selfPath: `/t/${enc}/feed.xml`,
    link: `/t/${enc}`,
  };
}

// JSON Feed 1.1 (https://jsonfeed.org) — a JSON alternative to the RSS feed,
// built from the same prompt rows. Pure; the route layer serializes it.
export type JsonFeedItem = {
  id: string;
  url: string;
  title: string;
  content_text: string;
  date_published?: string;
};
export type JsonFeed = {
  version: string;
  title: string;
  description?: string;
  home_page_url: string;
  feed_url: string;
  items: JsonFeedItem[];
};

export function buildJsonFeed(baseUrl: string, prompts: RssPrompt[], channel: RssChannel = {}): JsonFeed {
  const base = baseUrl.replace(/\/$/, "");
  const feed: JsonFeed = {
    version: "https://jsonfeed.org/version/1.1",
    title: channel.title ?? "PromptingHub — Trending prompts",
    home_page_url: base,
    feed_url: `${base}${channel.selfPath ?? "/feed.json"}`,
    items: prompts.map((p) => {
      const url = `${base}${promptPath(p)}`;
      const item: JsonFeedItem = { id: url, url, title: p.name, content_text: p.description };
      if (p.createdAt) item.date_published = new Date(p.createdAt).toISOString();
      return item;
    }),
  };
  if (channel.description) feed.description = channel.description;
  return feed;
}

export function buildRssFeed(baseUrl: string, prompts: RssPrompt[], channel: RssChannel = {}): string {
  const base = baseUrl.replace(/\/$/, "");
  const title = channel.title ?? "PromptingHub — Trending prompts";
  const description = channel.description ?? "The most popular prompts on PromptingHub, updated continuously.";
  const selfPath = channel.selfPath ?? "/feed.xml";
  const channelLink = channel.link ? `${base}${channel.link}` : base;
  const items = prompts
    .map((p) => {
      const link = `${base}${promptPath(p)}`;
      const date = p.createdAt ? `\n      <pubDate>${p.createdAt.toUTCString()}</pubDate>` : "";
      return `    <item>
      <title>${esc(p.name)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${esc(p.id)}</guid>
      <description>${esc(p.description)}</description>${date}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(title)}</title>
    <link>${channelLink}</link>
    <description>${esc(description)}</description>
    <language>en</language>
    <atom:link href="${base}${selfPath}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
