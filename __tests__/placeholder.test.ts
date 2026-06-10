import { getPlaceholderImage, promptImageSrc } from "../lib/constants";

describe("generative cover (getPlaceholderImage)", () => {
  it("is deterministic — same seed yields identical output", () => {
    expect(getPlaceholderImage("abc", "Coding")).toBe(getPlaceholderImage("abc", "Coding"));
  });

  it("differs across seeds (distinct cover per prompt)", () => {
    const a = getPlaceholderImage("prompt-one", "Coding");
    const b = getPlaceholderImage("prompt-two", "Coding");
    expect(a).not.toBe(b);
  });

  it("returns an inline SVG data URI (never 404s)", () => {
    const uri = getPlaceholderImage("x", "Writing");
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
    const svg = decodeURIComponent(uri.replace("data:image/svg+xml,", ""));
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    // generative layers are present
    expect(svg).toContain("linearGradient");
    expect(svg).toMatch(/<circle/);
  });

  it("category tints the palette (image vs code differ)", () => {
    expect(getPlaceholderImage("same-seed", "Coding")).not.toBe(
      getPlaceholderImage("same-seed", "Image Generation"),
    );
  });

  it("promptImageSrc prefers an uploaded image, else falls back to the cover", () => {
    expect(promptImageSrc("https://example.com/i.png", "s")).toBe("https://example.com/i.png");
    expect(promptImageSrc(null, "s", "Coding")).toBe(getPlaceholderImage("s", "Coding"));
    expect(promptImageSrc("   ", "s", "Coding")).toBe(getPlaceholderImage("s", "Coding"));
  });
});
