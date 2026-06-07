import { buildOEmbed, embedHtml, oembedDiscoveryUrl, parseOEmbedTarget, embedMetadata } from "../lib/oembed";

const base = "https://example.com";
const prompt = { id: "abc123", name: "SEO Title Writer", author: { name: "Ada" } };

describe("embedMetadata", () => {
  it("marks the embed page noindex but lets crawlers follow to the canonical prompt", () => {
    const m = embedMetadata(base, "abc123");
    expect(m.robots).toEqual({ index: false, follow: true });
  });

  it("still advertises the oEmbed discovery link pointing at the canonical prompt url", () => {
    const m = embedMetadata(base, "abc123");
    const oembed = (m.alternates?.types as Record<string, unknown>)["application/json+oembed"];
    expect(oembed).toBe(oembedDiscoveryUrl(base, `${base}/prompt/abc123`));
  });

  it("has a descriptive title", () => {
    expect(embedMetadata(base, "abc123").title).toContain("PromptingHub");
  });
});

describe("parseOEmbedTarget", () => {
  const id = "6a246476f014ab933b615829";

  it("resolves a /prompt/<id> url to an id target", () => {
    expect(parseOEmbedTarget(`https://x.com/prompt/${id}`)).toEqual({ kind: "id", id });
  });

  it("resolves an /embed/<id> url to an id target", () => {
    expect(parseOEmbedTarget(`https://x.com/embed/${id}?foo=1`)).toEqual({ kind: "id", id });
  });

  it("resolves a namespaced /p/<handle>/<slug> url to a handle target", () => {
    expect(parseOEmbedTarget("https://x.com/p/ada/code-reviewer")).toEqual({
      kind: "handle",
      handle: "ada",
      slug: "code-reviewer",
    });
  });

  it("prefers the id form when both could match", () => {
    expect(parseOEmbedTarget(`https://x.com/prompt/${id}`)).toEqual({ kind: "id", id });
  });

  it("returns null for an unrelated or malformed url", () => {
    expect(parseOEmbedTarget("https://x.com/browse")).toBeNull();
    expect(parseOEmbedTarget("https://x.com/prompt/not-an-id")).toBeNull();
  });
});

describe("oembedDiscoveryUrl", () => {
  it("builds a /api/oembed discovery url with the target url-encoded and format=json", () => {
    const url = oembedDiscoveryUrl("https://example.com", "https://example.com/prompt/abc123");
    expect(url).toBe(
      "https://example.com/api/oembed?url=https%3A%2F%2Fexample.com%2Fprompt%2Fabc123&format=json"
    );
  });

  it("trims a trailing slash on the site url", () => {
    const url = oembedDiscoveryUrl("https://example.com/", "https://example.com/prompt/x");
    expect(url.startsWith("https://example.com/api/oembed?")).toBe(true);
    expect(url).not.toContain("//api/oembed");
  });
});

describe("oembed", () => {
  it("builds a rich oEmbed payload pointing at the embed iframe", () => {
    const o = buildOEmbed(base, prompt, {});
    expect(o.type).toBe("rich");
    expect(o.version).toBe("1.0");
    expect(o.title).toBe("SEO Title Writer");
    expect(o.author_name).toBe("Ada");
    expect(o.provider_name).toBe("PromptingHub");
    expect(o.provider_url).toBe(base);
    expect(o.html).toContain(`${base}/embed/abc123`);
    expect(o.html).toContain("<iframe");
    expect(o.width).toBe(600);
    expect(o.height).toBe(400);
  });

  it("respects maxwidth / maxheight bounds", () => {
    const o = buildOEmbed(base, prompt, { maxwidth: 400, maxheight: 300 });
    expect(o.width).toBe(400);
    expect(o.height).toBe(300);
    expect(o.html).toContain('width="400"');
    expect(o.html).toContain('height="300"');
  });

  it("never exceeds the default size when maxwidth is larger", () => {
    const o = buildOEmbed(base, prompt, { maxwidth: 9999, maxheight: 9999 });
    expect(o.width).toBe(600);
    expect(o.height).toBe(400);
  });

  it("strips a trailing slash from the base url", () => {
    const o = buildOEmbed("https://example.com/", prompt, {});
    expect(o.html).toContain("https://example.com/embed/abc123");
    expect(o.html).not.toContain("com//embed");
    expect(o.provider_url).toBe("https://example.com");
  });

  it("escapes the title in the iframe attributes", () => {
    const o = embedHtml(base, { id: "x1", name: 'A "quoted" & <b>bold</b>' }, 600, 400);
    expect(o).not.toContain('<b>bold</b>');
    expect(o).toContain("&quot;");
    expect(o).toContain("&amp;");
    expect(o).toContain("&lt;");
  });
});
