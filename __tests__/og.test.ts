import { ogImagePath, ogTextParams, socialImageUrl } from "../lib/og";

describe("ogTextParams", () => {
  it("clamps the title and subtitle lengths", () => {
    const { title, subtitle } = ogTextParams("x".repeat(200), "y".repeat(400));
    expect(title.length).toBeLessThanOrEqual(80);
    expect(subtitle.length).toBeLessThanOrEqual(140);
  });

  it("defaults a missing subtitle to empty", () => {
    expect(ogTextParams("hi").subtitle).toBe("");
  });
});

describe("ogImagePath", () => {
  it("builds an encoded /api/og query string", () => {
    const p = ogImagePath("A & B", "say hi");
    expect(p.startsWith("/api/og?")).toBe(true);
    expect(p).toContain("title=A+%26+B");
    expect(p).toContain("subtitle=say+hi");
  });
});

describe("socialImageUrl", () => {
  it("uses a real http(s) image as-is", () => {
    expect(socialImageUrl("https://cdn.example.com/c.png", "Title")).toBe("https://cdn.example.com/c.png");
    expect(socialImageUrl("http://x/y.jpg", "Title")).toBe("http://x/y.jpg");
  });

  it("falls back to the /api/og PNG for a data: URI placeholder", () => {
    const out = socialImageUrl("data:image/svg+xml,%3Csvg/%3E", "My Prompt", "desc");
    expect(out.startsWith("/api/og?")).toBe(true);
    expect(out).toContain("title=My+Prompt");
  });

  it("falls back when the image is missing or relative", () => {
    expect(socialImageUrl(null, "T").startsWith("/api/og?")).toBe(true);
    expect(socialImageUrl("", "T").startsWith("/api/og?")).toBe(true);
    expect(socialImageUrl("/static/x.png", "T").startsWith("/api/og?")).toBe(true);
  });
});
