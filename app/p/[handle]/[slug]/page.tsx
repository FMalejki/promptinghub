import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getPromptDetailByHandleAndSlug } from "@/lib/prompts";
import { promptOgMetadata, canonicalPromptUrl } from "@/lib/meta";
import { oembedDiscoveryUrl } from "@/lib/oembed";
import { getPlaceholderImage } from "@/lib/constants";
import { NamespacedPromptClient } from "./NamespacedPromptClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

// Server-side metadata so shared @handle/slug links render a rich preview.
export async function generateMetadata({ params }: { params: { handle: string; slug: string } }): Promise<Metadata> {
  try {
    const detail = await getPromptDetailByHandleAndSlug(await getDb(), params.handle, params.slug);
    if (!detail || detail.isPrivate) return promptOgMetadata(null);
    // Discovery points at the /prompt/<id> form — the only shape /api/oembed resolves.
    return promptOgMetadata(
      { name: detail.name, description: detail.description, image: detail.image || getPlaceholderImage(detail.id) },
      {
        oembedUrl: oembedDiscoveryUrl(SITE_URL, `${SITE_URL}/prompt/${detail.id}`),
        canonical: canonicalPromptUrl(SITE_URL, detail),
      },
    );
  } catch {
    return promptOgMetadata(null);
  }
}

export default function NamespacedPromptPage({ params }: { params: { handle: string; slug: string } }) {
  return <NamespacedPromptClient handle={params.handle} slug={params.slug} />;
}
