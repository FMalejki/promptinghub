import { buildSitemapEntries, type SitemapPrompt } from "../lib/sitemap";

const base = "https://promptinghub.example";

describe("buildSitemapEntries", () => {
  it("always includes the home and browse pages", () => {
    const urls = buildSitemapEntries(base, []).map((e) => e.url);
    expect(urls).toContain(`${base}/`);
    expect(urls).toContain(`${base}/browse`);
  });

  it("uses the canonical /p/handle/slug url when available", () => {
    const prompts: SitemapPrompt[] = [
      { id: "1", handle: "alice", slug: "cold-email", isPrivate: false, createdAt: new Date("2026-01-01") },
    ];
    const entry = buildSitemapEntries(base, prompts).find((e) => e.url.includes("cold-email"));
    expect(entry?.url).toBe(`${base}/p/alice/cold-email`);
  });

  it("falls back to /prompt/id when no handle/slug", () => {
    const prompts: SitemapPrompt[] = [{ id: "abc", isPrivate: false, createdAt: new Date("2026-01-01") }];
    const entry = buildSitemapEntries(base, prompts).find((e) => e.url.includes("/prompt/"));
    expect(entry?.url).toBe(`${base}/prompt/abc`);
  });

  it("omits private prompts", () => {
    const prompts: SitemapPrompt[] = [{ id: "secret", isPrivate: true, createdAt: new Date() }];
    const urls = buildSitemapEntries(base, prompts).map((e) => e.url);
    expect(urls.some((u) => u.includes("secret"))).toBe(false);
  });

  it("carries lastModified from createdAt", () => {
    const d = new Date("2026-03-04");
    const entry = buildSitemapEntries(base, [{ id: "x", isPrivate: false, createdAt: d }]).find((e) => e.url.includes("/prompt/x"));
    expect(entry?.lastModified).toEqual(d);
  });

  it("includes the taxonomy index pages", () => {
    const urls = buildSitemapEntries(base, []).map((e) => e.url);
    for (const p of ["/tags", "/categories", "/creators", "/collections"]) {
      expect(urls).toContain(`${base}${p}`);
    }
  });

  it("adds tag, collection and creator entries (URL-encoded)", () => {
    const urls = buildSitemapEntries(base, [], {
      tags: ["c++", "seo"],
      collections: ["abc123"],
      creators: ["alice"],
    }).map((e) => e.url);
    expect(urls).toContain(`${base}/t/c%2B%2B`);
    expect(urls).toContain(`${base}/t/seo`);
    expect(urls).toContain(`${base}/collections/abc123`);
    expect(urls).toContain(`${base}/u/alice`);
  });

  it("de-duplicates repeated urls", () => {
    const urls = buildSitemapEntries(base, [], { tags: ["seo", "seo"] }).map((e) => e.url);
    expect(urls.filter((u) => u === `${base}/t/seo`)).toHaveLength(1);
  });
});
