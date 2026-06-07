// A collection has no uploaded artwork — derive a cover from its prompts by
// taking the first one that ships an image, in saved order.

export type CoverItem = { image?: string | null };

export function collectionCover(prompts: CoverItem[]): string | null {
  for (const p of prompts) {
    const img = (p.image || "").trim();
    if (img) return img;
  }
  return null;
}
