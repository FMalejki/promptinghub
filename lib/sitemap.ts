export type SitemapPrompt = {
  id: string;
  handle?: string;
  slug?: string;
  isPrivate: boolean;
  createdAt?: Date;
  updatedAt?: Date | null;
};

export type SitemapEntry = { url: string; lastModified?: Date };

// Optional taxonomy pages to include for SEO discoverability.
export type SitemapExtras = { tags?: string[]; collections?: string[]; creators?: string[] };

/**
 * Build sitemap entries for the public site: static pages plus one entry per
 * public prompt (canonical /p/handle/slug when available, else /prompt/id), and
 * optional taxonomy pages (tags, collections, creator profiles). Private
 * prompts are excluded; entries are de-duplicated and taxonomy paths URL-encoded.
 */
export function buildSitemapEntries(baseUrl: string, prompts: SitemapPrompt[], extras: SitemapExtras = {}): SitemapEntry[] {
  const base = baseUrl.replace(/\/$/, "");
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  const add = (path: string, lastModified?: Date) => {
    const url = `${base}${path}`;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push(lastModified ? { url, lastModified } : { url });
  };

  // Static index pages.
  for (const p of ["/", "/browse", "/tags", "/categories", "/creators", "/collections"]) add(p);

  for (const p of prompts) {
    if (p.isPrivate) continue;
    const path = p.handle && p.slug ? `/p/${p.handle}/${p.slug}` : `/prompt/${p.id}`;
    // Prefer the last edit time so search engines re-crawl updated prompts.
    add(path, p.updatedAt ?? p.createdAt);
  }

  for (const tag of extras.tags ?? []) add(`/t/${encodeURIComponent(tag)}`);
  for (const id of extras.collections ?? []) add(`/collections/${encodeURIComponent(id)}`);
  for (const handle of extras.creators ?? []) add(`/u/${encodeURIComponent(handle)}`);

  return entries;
}
