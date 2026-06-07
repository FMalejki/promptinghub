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
