import { getPlaceholderImage, promptImageSrc } from "../lib/constants";

describe("getPlaceholderImage", () => {
  it("always returns an inline SVG data URI (can never 404)", () => {
    for (const [seed, cat] of [["a", undefined], ["x", "Coding"], ["", "Fun"]] as const) {
      expect(getPlaceholderImage(seed, cat as string | undefined)).toMatch(/^data:image\/svg\+xml,/);
    }
  });

  it("is deterministic for the same seed + category", () => {
    expect(getPlaceholderImage("p1", "Writing")).toBe(getPlaceholderImage("p1", "Writing"));
  });

  it("varies by seed", () => {
    expect(getPlaceholderImage("p1", "Writing")).not.toBe(getPlaceholderImage("p2", "Writing"));
  });

  it("varies by category bucket (different colour + glyph)", () => {
    const seed = "same-seed";
    expect(getPlaceholderImage(seed, "Coding")).not.toBe(getPlaceholderImage(seed, "Fun"));
    expect(getPlaceholderImage(seed, "Coding")).not.toBe(getPlaceholderImage(seed, "Image Generation"));
    // unknown/undefined category falls back to the default bucket, distinct from code
    expect(getPlaceholderImage(seed, "Coding")).not.toBe(getPlaceholderImage(seed));
  });

  it("promptImageSrc prefers a real image and falls back with category", () => {
    expect(promptImageSrc("https://example.com/x.png", "id", "Coding")).toBe("https://example.com/x.png");
    expect(promptImageSrc("", "id", "Coding")).toBe(getPlaceholderImage("id", "Coding"));
    expect(promptImageSrc(null, "id")).toBe(getPlaceholderImage("id"));
  });
});
