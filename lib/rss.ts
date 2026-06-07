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

export function buildRssFeed(baseUrl: string, prompts: RssPrompt[]): string {
  const base = baseUrl.replace(/\/$/, "");
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
    <title>PromptingHub — Trending prompts</title>
    <link>${base}</link>
    <description>The most popular prompts on PromptingHub, updated continuously.</description>
    <language>en</language>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
