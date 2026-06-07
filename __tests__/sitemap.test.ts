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
});
