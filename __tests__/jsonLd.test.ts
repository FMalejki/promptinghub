import { promptJsonLd, siteJsonLd, collectionsItemListJsonLd } from "../lib/jsonLd";

const base = "https://promptinghub.app";

describe("collectionsItemListJsonLd", () => {
  const collections = [
    { id: "c1", name: "Writing kit" },
    { id: "c2", name: "Dev tools" },
  ];

  it("builds an ItemList with 1-based positions and canonical collection urls", () => {
    const ld = collectionsItemListJsonLd(collections, base);
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.itemListElement).toHaveLength(2);
    expect(ld.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      url: `${base}/collections/c1`,
      name: "Writing kit",
    });
    expect(ld.itemListElement[1].position).toBe(2);
    expect(ld.itemListElement[1].url).toBe(`${base}/collections/c2`);
  });

  it("trims a trailing slash and reports the list length", () => {
    const ld = collectionsItemListJsonLd(collections, "https://promptinghub.app/");
    expect(ld.itemListElement[0].url).toBe("https://promptinghub.app/collections/c1");
    expect(ld.numberOfItems).toBe(2);
  });

  it("is well-formed for an empty list", () => {
    const ld = collectionsItemListJsonLd([], base);
    expect(ld.itemListElement).toEqual([]);
    expect(ld.numberOfItems).toBe(0);
  });
});

describe("siteJsonLd", () => {
  it("describes the site as a WebSite with a name and canonical url", () => {
    const ld = siteJsonLd(base);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.name).toBe("PromptingHub");
    expect(ld.url).toBe(base);
  });

  it("exposes a SearchAction targeting browse with the {search_term_string} template", () => {
    const ld = siteJsonLd(base);
    expect(ld.potentialAction["@type"]).toBe("SearchAction");
    expect(ld.potentialAction.target.urlTemplate).toBe(`${base}/browse?q={search_term_string}`);
    expect(ld.potentialAction["query-input"]).toBe("required name=search_term_string");
  });

  it("trims a trailing slash on the base url", () => {
    const ld = siteJsonLd("https://promptinghub.app/");
    expect(ld.url).toBe("https://promptinghub.app");
    expect(ld.potentialAction.target.urlTemplate).toBe("https://promptinghub.app/browse?q={search_term_string}");
  });
});

const detail = {
  id: "abc123",
  name: "Haiku Writer",
  description: "Writes a haiku about anything",
  author: { email: "bob@x.com", name: "Bob", image: null },
  tags: ["poetry", "creative"],
  copyCount: 12,
  stars: 5,
  createdAt: new Date("2026-01-02T03:04:05Z"),
  updatedAt: new Date("2026-02-03T00:00:00Z"),
};

describe("promptJsonLd", () => {
  it("builds a schema.org CreativeWork with the canonical url", () => {
    const ld = promptJsonLd(detail as any, base);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("CreativeWork");
    expect(ld.url).toBe("https://promptinghub.app/prompt/abc123");
    expect(ld.name).toBe("Haiku Writer");
    expect(ld.description).toBe("Writes a haiku about anything");
  });

  it("maps author, dates, keywords and interaction count", () => {
    const ld = promptJsonLd(detail as any, base);
    expect(ld.author).toEqual({ "@type": "Person", name: "Bob" });
    expect(ld.datePublished).toBe("2026-01-02T03:04:05.000Z");
    expect(ld.dateModified).toBe("2026-02-03T00:00:00.000Z");
    expect(ld.keywords).toBe("poetry, creative");
    expect(ld.interactionStatistic).toMatchObject({
      "@type": "InteractionCounter",
      userInteractionCount: 12,
    });
  });

  it("falls back to datePublished when never updated, and omits empty keywords", () => {
    const ld = promptJsonLd({ ...detail, updatedAt: null, tags: [] } as any, base);
    expect(ld.dateModified).toBe(ld.datePublished);
    expect(ld.keywords).toBeUndefined();
  });

  it("trims a trailing slash on the base url", () => {
    const ld = promptJsonLd(detail as any, "https://promptinghub.app/");
    expect(ld.url).toBe("https://promptinghub.app/prompt/abc123");
  });

  it("uses the email local-part when the author has no name", () => {
    const ld = promptJsonLd({ ...detail, author: { email: "carol@x.com", name: "", image: null } } as any, base);
    expect(ld.author.name).toBe("carol");
  });
});
