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
