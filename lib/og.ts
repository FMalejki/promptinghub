// Helpers for the dynamic OpenGraph image at /api/og. Kept pure so the URL
// building + text clamping are unit-testable; the route renders the image.

export const OG_TITLE_MAX = 80;
export const OG_SUBTITLE_MAX = 140;

export function ogTextParams(title: string, subtitle?: string): { title: string; subtitle: string } {
  return {
    title: (title || "").slice(0, OG_TITLE_MAX),
    subtitle: (subtitle || "").slice(0, OG_SUBTITLE_MAX),
  };
}

// Relative path; resolved to an absolute URL by Next via metadataBase.
export function ogImagePath(title: string, subtitle?: string): string {
  const t = ogTextParams(title, subtitle);
  const params = new URLSearchParams({ title: t.title });
  if (t.subtitle) params.set("subtitle", t.subtitle);
  return `/api/og?${params.toString()}`;
}

// Pick the image for a social card. Twitter/Discord/Slack/Facebook DON'T render
// `data:` URIs (our generated SVG placeholder is one) — they need a real
// http(s) URL. So only use a caller-supplied image when it's an absolute
// http(s) link; otherwise fall back to the dynamic /api/og PNG (relative, which
// Next resolves to absolute via metadataBase). This stops placeholder-cover
// prompts from sharing with a broken/blank preview image.
export function socialImageUrl(image: string | null | undefined, title: string, subtitle?: string): string {
  if (image && /^https?:\/\//i.test(image.trim())) return image.trim();
  return ogImagePath(title, subtitle);
}
