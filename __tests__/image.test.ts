import { promptImageSrc, getPlaceholderImage } from "../lib/constants";

describe("promptImageSrc (fallback image)", () => {
  it("uses the prompt's own image when present", () => {
    expect(promptImageSrc("https://cdn/x.png", "abc")).toBe("https://cdn/x.png");
  });
  it("falls back to a deterministic placeholder when image is null/empty", () => {
    expect(promptImageSrc(null, "abc")).toBe(getPlaceholderImage("abc"));
    expect(promptImageSrc("", "abc")).toBe(getPlaceholderImage("abc"));
  });
  it("is deterministic for the same seed", () => {
    expect(promptImageSrc(null, "seed-1")).toBe(promptImageSrc(null, "seed-1"));
  });
});

describe("getPlaceholderImage (self-contained, can't 404)", () => {
  it("returns a local inline SVG data URI — no external/network dependency", () => {
    const src = getPlaceholderImage("abc");
    expect(src.startsWith("data:image/svg+xml,")).toBe(true);
    expect(src).not.toMatch(/^https?:/); // never an external URL (the old Unsplash bug)
  });

  it("decodes to valid SVG markup", () => {
    const src = getPlaceholderImage("hello");
    const svg = decodeURIComponent(src.replace("data:image/svg+xml,", ""));
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("varies the gradient by seed but stays deterministic", () => {
    expect(getPlaceholderImage("a")).toBe(getPlaceholderImage("a"));
    expect(getPlaceholderImage("a")).not.toBe(getPlaceholderImage("completely-different"));
  });
});
