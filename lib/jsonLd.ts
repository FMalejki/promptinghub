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

// schema.org WebSite for the whole site, with a SearchAction so Google can show
// a sitelinks search box that queries our /browse page directly. Emitted once in
// the root layout. Pure.
export function siteJsonLd(baseUrl: string): Record<string, any> {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PromptingHub",
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/browse?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

// schema.org ItemList for the /collections listing page — gives search engines
// a structured, ordered list of the public collections with their canonical
// URLs. Pure; trailing-slash-safe; valid for an empty list.
export function collectionsItemListJsonLd(
  collections: { id: string; name: string }[],
  baseUrl: string,
): Record<string, any> {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Collections · PromptingHub",
    numberOfItems: collections.length,
    itemListElement: collections.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/collections/${c.id}`,
      name: c.name,
    })),
  };
}

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

// schema.org ProfilePage wrapping a Person for a creator page, so search engines
// can associate the profile with the creator's external links (sameAs).
export function creatorJsonLd(
  c: { name: string; handle: string; image?: string | null; bio?: string | null; website?: string | null; x?: string | null; github?: string | null },
  baseUrl: string,
): Record<string, any> {
  const base = baseUrl.replace(/\/+$/, "");
  const sameAs: string[] = [];
  if (c.website && c.website.trim()) sameAs.push(c.website.trim());
  if (c.x && c.x.trim()) sameAs.push(`https://x.com/${c.x.trim().replace(/^@/, "")}`);
  if (c.github && c.github.trim()) sameAs.push(`https://github.com/${c.github.trim()}`);

  const person: Record<string, any> = {
    "@type": "Person",
    name: c.name,
    url: `${base}/u/${c.handle}`,
  };
  if (c.image) person.image = c.image;
  if (c.bio && c.bio.trim()) person.description = c.bio;
  if (sameAs.length) person.sameAs = sameAs;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: person,
  };
}
