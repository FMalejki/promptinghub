// Heuristic: does this URL look like a *direct* image (so an <img src> will
// actually render it)? Used to warn authors who paste an album/gallery/page link
// (e.g. imgur.com/a/…) that won't display. Intentionally permissive — it only
// warns, never blocks submit.

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/;

// Hosts/CDNs that commonly serve images without a file extension.
const CDN_HOSTS = new Set([
  "images.unsplash.com",
  "i.imgur.com",
  "pbs.twimg.com",
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
  "i.redd.it",
  "media.giphy.com",
]);
const CDN_HINTS = ["imgix", "cloudinary", "cloudfront", "googleusercontent", "unsplash"];

export function isLikelyImageUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const s = url.trim();
  if (!s) return false;
  if (s.startsWith("data:image/")) return true;

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;

  const path = u.pathname.toLowerCase();
  if (IMAGE_EXT.test(path)) return true;

  const host = u.hostname.toLowerCase();
  const hasPath = path.length > 1;
  if (hasPath && CDN_HOSTS.has(host)) return true;
  if (hasPath && CDN_HINTS.some((h) => host.includes(h))) return true;

  return false;
}
