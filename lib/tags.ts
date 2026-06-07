// Free-form tag normalization, shared by create/update/schema and filtering.
// Tags are lowercased, space-hyphenated, stripped of disallowed punctuation,
// deduped, and capped (10 tags × 30 chars) so they stay URL- and index-friendly.

export const MAX_TAGS = 10;
export const MAX_TAG_LEN = 30;

function normalizeOne(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/[^a-z0-9+#.\-]/g, "") // keep alnum and a few code-ish chars
    .slice(0, MAX_TAG_LEN);
}

export function normalizeTags(input: string | string[] | undefined | null): string[] {
  if (!input) return [];
  const parts = Array.isArray(input)
    ? input.filter((p): p is string => typeof p === "string")
    : input.includes(",")
    ? input.split(/[,\n]/) // comma-separated: keep multi-word entries (spaces become hyphens)
    : input.split(/\s+/); // whitespace-separated: each token is its own tag
  const out: string[] = [];
  for (const part of parts) {
    const tag = normalizeOne(part);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}
