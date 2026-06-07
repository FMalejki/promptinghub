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
