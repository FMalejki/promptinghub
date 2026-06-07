// oEmbed (rich type) support so a prompt URL can be embedded in blogs, Notion,
// etc. See https://oembed.com/. We render a small responsive iframe.

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
