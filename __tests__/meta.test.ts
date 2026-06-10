import { promptOgMetadata, canonicalPromptUrl } from "../lib/meta";

describe("canonicalPromptUrl", () => {
  it("prefers the namespaced /p/<handle>/<slug> form when available", () => {
    expect(canonicalPromptUrl("https://site", { id: "x", handle: "ada", slug: "code-reviewer" })).toBe(
      "https://site/p/ada/code-reviewer"
    );
  });

  it("falls back to /prompt/<id> when there is no handle/slug", () => {
    expect(canonicalPromptUrl("https://site", { id: "abc" })).toBe("https://site/prompt/abc");
  });

  it("trims a trailing slash on the base url", () => {
    expect(canonicalPromptUrl("https://site/", { id: "abc" })).toBe("https://site/prompt/abc");
  });
});

describe("promptOgMetadata", () => {
  it("builds title/description and OpenGraph + Twitter cards", () => {
    const m = promptOgMetadata({
      name: "Cold Email",
      description: "A B2B cold email generator",
      image: "https://img/x.png",
    });
    // Page title is bare (root layout template appends "· PromptingHub" once);
    // OG/twitter titles are not templated, so they keep the brand explicitly.
    expect(m.title).toBe("Cold Email");
    expect(m.description).toBe("A B2B cold email generator");
    expect(m.openGraph?.title).toBe("Cold Email · PromptingHub");
    expect(m.openGraph?.images).toEqual([{ url: "https://img/x.png" }]);
    expect((m.twitter as { card?: string })?.card).toBe("summary_large_image");
  });

  it("truncates an overly long description", () => {
    const m = promptOgMetadata({ name: "P", description: "x".repeat(300) });
    expect((m.description as string).length).toBeLessThanOrEqual(200);
  });

  it("falls back to the dynamic OG image when none is provided", () => {
    const m = promptOgMetadata({ name: "Hello World", description: "a nice prompt" });
    const url = (m.openGraph?.images as { url: string }[])?.[0]?.url;
    expect(url).toContain("/api/og?");
    expect(url).toContain("title=Hello+World");
  });

  it("falls back to a generic card when the prompt is missing/private", () => {
    const m = promptOgMetadata(null);
    expect(m.title).toBe("Prompt");
    expect(typeof m.description).toBe("string");
  });

  it("adds an oEmbed discovery alternate when an oembedUrl is supplied", () => {
    const m = promptOgMetadata(
      { name: "Cold Email", description: "desc" },
      { oembedUrl: "https://site/api/oembed?url=x&format=json" },
    );
    const oembed = (m.alternates?.types as Record<string, { url: string; title?: string }[]>)[
      "application/json+oembed"
    ];
    expect(oembed[0].url).toBe("https://site/api/oembed?url=x&format=json");
    expect(oembed[0].title).toBe("Cold Email");
  });

  it("sets a canonical url, alongside the oEmbed alternate, without clobbering either", () => {
    const m = promptOgMetadata(
      { name: "Cold Email", description: "desc" },
      { canonical: "https://site/p/ada/cold-email", oembedUrl: "https://site/api/oembed?url=x&format=json" },
    );
    expect(m.alternates?.canonical).toBe("https://site/p/ada/cold-email");
    expect((m.alternates?.types as Record<string, unknown>)["application/json+oembed"]).toBeTruthy();
  });

  it("omits canonical when not supplied", () => {
    const m = promptOgMetadata({ name: "X", description: "y" });
    expect(m.alternates?.canonical).toBeUndefined();
  });

  it("omits the oEmbed alternate when no oembedUrl is given", () => {
    const m = promptOgMetadata({ name: "X", description: "y" });
    expect(m.alternates).toBeUndefined();
  });

  it("never attaches an oEmbed alternate to the generic/private card", () => {
    const m = promptOgMetadata(null, { oembedUrl: "https://site/api/oembed?url=x&format=json" });
    expect(m.alternates).toBeUndefined();
  });
});
