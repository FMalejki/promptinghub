import { promptJsonLd } from "../lib/jsonLd";

const base = "https://promptinghub.app";

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
