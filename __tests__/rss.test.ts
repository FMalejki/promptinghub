import { buildRssFeed, type RssPrompt } from "../lib/rss";

const base = "https://hub.example.com";

describe("buildRssFeed", () => {
  const items: RssPrompt[] = [
    { id: "1", name: "Cold email", description: "Outreach", handle: "alice", slug: "cold-email", createdAt: new Date("2026-02-01T00:00:00Z") },
    { id: "abc123", name: "No handle", description: "x", createdAt: new Date("2026-01-01T00:00:00Z") },
  ];

  it("emits a valid RSS 2.0 channel with self link and item guids", () => {
    const xml = buildRssFeed(base, items);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("xmlns:atom=\"http://www.w3.org/2005/Atom\"");
    expect(xml).toContain(`<atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />`);
    expect(xml).toContain("<channel>");
    expect(xml.trim().endsWith("</rss>")).toBe(true);
  });

  it("uses canonical /p/handle/slug when available, else /prompt/id", () => {
    const xml = buildRssFeed(base, items);
    expect(xml).toContain(`<link>${base}/p/alice/cold-email</link>`);
    expect(xml).toContain(`<guid isPermaLink="false">1</guid>`);
    expect(xml).toContain(`<link>${base}/prompt/abc123</link>`);
  });

  it("escapes XML special characters in titles and descriptions", () => {
    const xml = buildRssFeed(base, [
      { id: "x", name: "A & B <tag>", description: 'say "hi" > there', createdAt: new Date("2026-02-01T00:00:00Z") },
    ]);
    expect(xml).toContain("<title>A &amp; B &lt;tag&gt;</title>");
    expect(xml).toContain("say &quot;hi&quot; &gt; there");
    expect(xml).not.toContain("<tag>");
  });

  it("formats pubDate as RFC-822 and trims a trailing slash on the base", () => {
    const xml = buildRssFeed(base + "/", items);
    expect(xml).toContain("<pubDate>Sun, 01 Feb 2026 00:00:00 GMT</pubDate>");
    expect(xml).not.toContain("example.com//");
  });

  it("defaults to the global trending channel metadata", () => {
    const xml = buildRssFeed(base, items);
    expect(xml).toContain("<title>PromptingHub — Trending prompts</title>");
    expect(xml).toContain(`<link>${base}</link>`);
    expect(xml).toContain(`<atom:link href="${base}/feed.xml"`);
  });

  it("accepts per-channel title/description/self path overrides (escaped)", () => {
    const xml = buildRssFeed(base, items, {
      title: "Alice & friends",
      description: "Prompts by <alice>",
      selfPath: "/u/alice/feed.xml",
      link: "/u/alice",
    });
    expect(xml).toContain("<title>Alice &amp; friends</title>");
    expect(xml).toContain("<description>Prompts by &lt;alice&gt;</description>");
    expect(xml).toContain(`<link>${base}/u/alice</link>`);
    expect(xml).toContain(`<atom:link href="${base}/u/alice/feed.xml" rel="self" type="application/rss+xml" />`);
  });
});
