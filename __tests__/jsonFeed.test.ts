import { buildJsonFeed, type RssPrompt } from "../lib/rss";

const base = "https://promptinghub.app";

describe("buildJsonFeed", () => {
  it("builds a JSON Feed 1.1 document with feed-level metadata", () => {
    const feed = buildJsonFeed(base, []);
    expect(feed.version).toBe("https://jsonfeed.org/version/1.1");
    expect(feed.home_page_url).toBe(base);
    expect(feed.feed_url).toBe(`${base}/feed.json`);
    expect(feed.title).toBeTruthy();
    expect(feed.items).toEqual([]);
  });

  it("maps prompts to items with canonical urls and dates", () => {
    const prompts: RssPrompt[] = [
      { id: "1", name: "Cold Email", description: "B2B", handle: "alice", slug: "cold-email", createdAt: new Date("2026-01-02T00:00:00Z") },
      { id: "abc", name: "No Handle", description: "d" },
    ];
    const feed = buildJsonFeed(base, prompts);
    expect(feed.items[0]).toEqual({
      id: `${base}/p/alice/cold-email`,
      url: `${base}/p/alice/cold-email`,
      title: "Cold Email",
      content_text: "B2B",
      date_published: "2026-01-02T00:00:00.000Z",
    });
    expect(feed.items[1].url).toBe(`${base}/prompt/abc`);
    expect(feed.items[1].date_published).toBeUndefined();
  });

  it("trims a trailing slash on the base url", () => {
    expect(buildJsonFeed(`${base}/`, []).feed_url).toBe(`${base}/feed.json`);
  });

  it("accepts channel overrides for title/description", () => {
    const feed = buildJsonFeed(base, [], { title: "Tag feed", description: "tagged" });
    expect(feed.title).toBe("Tag feed");
    expect(feed.description).toBe("tagged");
  });

  it("uses a custom selfPath for feed_url (e.g. a collection feed)", () => {
    const feed = buildJsonFeed(base, [], { selfPath: "/collections/abc/feed.json" });
    expect(feed.feed_url).toBe(`${base}/collections/abc/feed.json`);
  });
});
