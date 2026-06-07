export type SitemapPrompt = {
  id: string;
  handle?: string;
  slug?: string;
  isPrivate: boolean;
  createdAt?: Date;
};

export type SitemapEntry = { url: string; lastModified?: Date };

/**
 * Build sitemap entries for the public site: static pages plus one entry per
 * public prompt (canonical /p/handle/slug when available, else /prompt/id).
 * Private prompts are excluded.
 */
export function buildSitemapEntries(baseUrl: string, prompts: SitemapPrompt[]): SitemapEntry[] {
  const base = baseUrl.replace(/\/$/, "");
  const entries: SitemapEntry[] = [{ url: `${base}/` }, { url: `${base}/browse` }];

  for (const p of prompts) {
    if (p.isPrivate) continue;
    const path = p.handle && p.slug ? `/p/${p.handle}/${p.slug}` : `/prompt/${p.id}`;
    entries.push({ url: `${base}${path}`, lastModified: p.createdAt });
  }
  return entries;
}
