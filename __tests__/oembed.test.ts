import { buildOEmbed, embedHtml } from "../lib/oembed";

const base = "https://example.com";
const prompt = { id: "abc123", name: "SEO Title Writer", author: { name: "Ada" } };

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
