// schema.org structured data for a prompt detail page, so search engines can
// show a rich result. Emitted as <script type="application/ld+json"> by the
// server page. Kept pure for testing — no DB or DOM access.

export type JsonLdPrompt = {
  id: string;
  name: string;
  description: string;
  author: { email: string; name: string };
  tags: string[];
  copyCount: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export function promptJsonLd(p: JsonLdPrompt, baseUrl: string): Record<string, any> {
  const base = baseUrl.replace(/\/+$/, "");
  const published = new Date(p.createdAt).toISOString();
  const authorName = p.author.name?.trim() || p.author.email.split("@")[0];
  const keywords = (p.tags || []).filter((t) => t && t.trim()).join(", ");

  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    url: `${base}/prompt/${p.id}`,
    name: p.name,
    description: p.description,
    author: { "@type": "Person", name: authorName },
    datePublished: published,
    dateModified: p.updatedAt ? new Date(p.updatedAt).toISOString() : published,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/UseAction",
      userInteractionCount: p.copyCount || 0,
    },
  };
  if (keywords) ld.keywords = keywords;
  return ld;
}

// schema.org BreadcrumbList for a prompt page (Browse → Category → Prompt), so
// search results can show a breadcrumb trail. Category level omitted when empty.
export function promptBreadcrumbJsonLd(
  p: { id: string; name: string; category: string },
  baseUrl: string,
): Record<string, any> {
  const base = baseUrl.replace(/\/+$/, "");
  const crumbs: { name: string; item: string }[] = [{ name: "Browse", item: `${base}/browse` }];
  if (p.category && p.category.trim()) {
    crumbs.push({ name: p.category, item: `${base}/c/${encodeURIComponent(p.category)}` });
  }
  crumbs.push({ name: p.name, item: `${base}/prompt/${p.id}` });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };
}
