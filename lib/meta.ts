import type { Metadata } from "next";

export type PromptMetaInput = {
  name: string;
  description: string;
  image?: string | null;
};

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Build page metadata (title + OpenGraph + Twitter card) for a prompt detail page,
 * so shared links render a rich preview. Pass `null` for a missing or private prompt
 * to get a safe generic card that leaks nothing.
 */
export function promptOgMetadata(input: PromptMetaInput | null): Metadata {
  if (!input) {
    return {
      title: "Prompt · PromptingHub",
      description: "Discover, share, and install AI prompts on PromptingHub.",
    };
  }
  const title = `${input.name} · PromptingHub`;
  const description = truncate(input.description, 200);
  const images = input.image ? [{ url: input.image }] : undefined;

  return {
    title,
    description,
    openGraph: { title, description, type: "article", images },
    twitter: { card: "summary_large_image", title, description, images: images?.map((i) => i.url) },
  };
}
