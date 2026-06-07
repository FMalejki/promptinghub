import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getPromptDetail } from "@/lib/prompts";
import { promptOgMetadata } from "@/lib/meta";
import { oembedDiscoveryUrl } from "@/lib/oembed";
import { promptJsonLd, promptBreadcrumbJsonLd } from "@/lib/jsonLd";
import { getPlaceholderImage } from "@/lib/constants";
import { PromptDetailClient } from "./PromptDetailClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

// Server-side metadata so shared links render a rich preview.
// Private prompts get a generic card (no content leak).
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const detail = await getPromptDetail(await getDb(), params.id);
    if (!detail || detail.isPrivate) return promptOgMetadata(null);
    return promptOgMetadata(
      { name: detail.name, description: detail.description, image: detail.image || getPlaceholderImage(detail.id) },
      { oembedUrl: oembedDiscoveryUrl(SITE_URL, `${SITE_URL}/prompt/${detail.id}`) },
    );
  } catch {
    return promptOgMetadata(null);
  }
}

// SSR-only structured data; skipped for missing/private prompts (no content leak).
async function promptLdJson(id: string): Promise<string | null> {
  try {
    const d = await getPromptDetail(await getDb(), id);
    if (!d || d.isPrivate) return null;
    return JSON.stringify([promptJsonLd(d, SITE_URL), promptBreadcrumbJsonLd(d, SITE_URL)]);
  } catch {
    return null;
  }
}

export default async function PromptDetailPage({ params }: { params: { id: string } }) {
  const ld = await promptLdJson(params.id);
  return (
    <>
      {ld && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      )}
      <PromptDetailClient id={params.id} />
    </>
  );
}
