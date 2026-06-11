import { isLikelyImageUrl } from "../lib/imageUrl";

describe("isLikelyImageUrl", () => {
  it("accepts direct image URLs by extension (any case, with query)", () => {
    expect(isLikelyImageUrl("https://example.com/cover.png")).toBe(true);
    expect(isLikelyImageUrl("https://example.com/a/b/Photo.JPG?w=400")).toBe(true);
    expect(isLikelyImageUrl("http://x.io/p.webp")).toBe(true);
    expect(isLikelyImageUrl("https://x.io/d.svg")).toBe(true);
  });

  it("accepts known image CDNs without an extension", () => {
    expect(isLikelyImageUrl("https://images.unsplash.com/photo-123456")).toBe(true);
    expect(isLikelyImageUrl("https://i.imgur.com/abc123")).toBe(true);
    expect(isLikelyImageUrl("https://res.cloudinary.com/demo/image/upload/x")).toBe(true);
  });

  it("accepts inline data image URIs", () => {
    expect(isLikelyImageUrl("data:image/svg+xml,%3Csvg/%3E")).toBe(true);
  });

  it("rejects album/gallery/page links and bare domains", () => {
    expect(isLikelyImageUrl("https://imgur.com/a/qCzETLD")).toBe(false); // album page
    expect(isLikelyImageUrl("https://imgur.com/gallery/abc")).toBe(false);
    expect(isLikelyImageUrl("https://example.com")).toBe(false); // bare domain
    expect(isLikelyImageUrl("https://example.com/")).toBe(false);
  });

  it("rejects non-http(s), empty, and malformed input", () => {
    expect(isLikelyImageUrl("ftp://x.io/a.png")).toBe(false);
    expect(isLikelyImageUrl("not a url")).toBe(false);
    expect(isLikelyImageUrl("")).toBe(false);
    expect(isLikelyImageUrl(null)).toBe(false);
    expect(isLikelyImageUrl(undefined)).toBe(false);
  });
});
