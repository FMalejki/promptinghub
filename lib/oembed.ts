// oEmbed (rich type) support so a prompt URL can be embedded in blogs, Notion,
// etc. See https://oembed.com/. We render a small responsive iframe.

import type { Metadata } from "next";

export const DEFAULT_EMBED_WIDTH = 600;
export const DEFAULT_EMBED_HEIGHT = 400;
const PROVIDER_NAME = "PromptingHub";

export type EmbedPrompt = { id: string; name: string; author?: { name: string } };
export type OEmbedOpts = { maxwidth?: number; maxheight?: number };

export type OEmbed = {
  type: "rich";
  version: "1.0";
  title: string;
  author_name?: string;
  provider_name: string;
  provider_url: string;
  width: number;
  height: number;
  html: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// The <iframe> markup an embedding site drops into its page.
export function embedHtml(baseUrl: string, prompt: EmbedPrompt, width: number, height: number): string {
  const base = baseUrl.replace(/\/$/, "");
  const src = `${base}/embed/${prompt.id}`;
  const title = esc(prompt.name);
  return (
    `<iframe src="${src}" width="${width}" height="${height}" ` +
    `style="border:1px solid #e5e7eb;border-radius:12px;max-width:100%;" ` +
    `title="${title}" frameborder="0" loading="lazy" allowfullscreen></iframe>`
  );
}

// The supported oEmbed URL shapes, resolved from the `?url=` param: either a
// /prompt|/embed/<id> URL (resolve by id) or a canonical /p/<handle>/<slug> URL.
export type OEmbedTarget =
  | { kind: "id"; id: string }
  | { kind: "handle"; handle: string; slug: string };

export function parseOEmbedTarget(url: string): OEmbedTarget | null {
  const byId = url.match(/\/(?:prompt|embed)\/([a-f0-9]{24})/i);
  if (byId) return { kind: "id", id: byId[1] };
  const ns = url.match(/\/p\/([a-z0-9_-]+)\/([a-z0-9_-]+)/i);
  if (ns) return { kind: "handle", handle: ns[1], slug: ns[2] };
  return null;
}

// The href for a `<link rel="alternate" type="application/json+oembed">` tag, so
// oEmbed consumers (WordPress, Discord, Slack, …) can auto-discover the embed
// from a shared prompt URL. `targetUrl` is the page being embedded; it must be a
// URL our /api/oembed endpoint can resolve (a /prompt/<id> or /embed/<id> URL).
export function oembedDiscoveryUrl(siteUrl: string, targetUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/api/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
}

// Metadata for the /embed/<id> iframe page. It is thin, chrome-free, duplicate
// content, so it must be noindex (follow so crawlers still reach the canonical
// /prompt/<id>); it keeps advertising the oEmbed discovery link.
export function embedMetadata(siteUrl: string, promptId: string): Metadata {
  const base = siteUrl.replace(/\/$/, "");
  const oembed = oembedDiscoveryUrl(base, `${base}/prompt/${promptId}`);
  return {
    title: "Embedded prompt — PromptingHub",
    robots: { index: false, follow: true },
    alternates: { types: { "application/json+oembed": oembed } },
  };
}

export function buildOEmbed(baseUrl: string, prompt: EmbedPrompt, opts: OEmbedOpts): OEmbed {
  const base = baseUrl.replace(/\/$/, "");
  const width = Math.min(DEFAULT_EMBED_WIDTH, opts.maxwidth ?? DEFAULT_EMBED_WIDTH);
  const height = Math.min(DEFAULT_EMBED_HEIGHT, opts.maxheight ?? DEFAULT_EMBED_HEIGHT);
  return {
    type: "rich",
    version: "1.0",
    title: prompt.name,
    ...(prompt.author?.name ? { author_name: prompt.author.name } : {}),
    provider_name: PROVIDER_NAME,
    provider_url: base,
    width,
    height,
    html: embedHtml(base, prompt, width, height),
  };
}
