import type { Metadata } from "next";
import { ogImagePath } from "./og";

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
export type PromptMetaOpts = {
  // When set, advertise an oEmbed discovery link so consumers (WordPress,
  // Discord, …) can auto-embed a shared prompt URL. Never attached to the
  // generic/private card.
  oembedUrl?: string;
  // The canonical URL for this prompt — set so the /prompt/<id> and
  // /p/<handle>/<slug> URLs don't compete as duplicate content.
  canonical?: string;
};

// The canonical URL for a prompt: the namespaced /p/<handle>/<slug> form when
// available, else /prompt/<id>. Both pages point here so search engines pick one.
export function canonicalPromptUrl(
  baseUrl: string,
  p: { id: string; handle?: string | null; slug?: string | null },
): string {
  const base = baseUrl.replace(/\/+$/, "");
  return p.handle && p.slug ? `${base}/p/${p.handle}/${p.slug}` : `${base}/prompt/${p.id}`;
}

export function promptOgMetadata(input: PromptMetaInput | null, opts: PromptMetaOpts = {}): Metadata {
  if (!input) {
    return {
      title: "Prompt",
      description: "Discover, share, and install AI prompts on PromptingHub.",
    };
  }
  // Page <title> is bare — the root layout template appends "· PromptingHub" once.
  // OG/twitter titles are NOT templated, so they carry the brand explicitly.
  const title = input.name;
  const branded = `${input.name} · PromptingHub`;
  const description = truncate(input.description, 200);
  // Fall back to a generated OG card so every share has an image (resolved to an
  // absolute URL by Next via metadataBase).
  const images = [{ url: input.image || ogImagePath(input.name, input.description) }];

  const meta: Metadata = {
    title,
    description,
    openGraph: { title: branded, description, type: "article", images },
    twitter: { card: "summary_large_image", title: branded, description, images: images?.map((i) => i.url) },
  };
  if (opts.oembedUrl || opts.canonical) {
    meta.alternates = {
      ...(opts.canonical ? { canonical: opts.canonical } : {}),
      ...(opts.oembedUrl
        ? { types: { "application/json+oembed": [{ url: opts.oembedUrl, title: input.name }] } }
        : {}),
    };
  }
  return meta;
}
