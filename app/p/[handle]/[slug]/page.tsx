import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getPromptDetailByHandleAndSlug } from "@/lib/prompts";
import { promptOgMetadata } from "@/lib/meta";
import { NamespacedPromptClient } from "./NamespacedPromptClient";

// Server-side metadata so shared @handle/slug links render a rich preview.
export async function generateMetadata({ params }: { params: { handle: string; slug: string } }): Promise<Metadata> {
  try {
    const detail = await getPromptDetailByHandleAndSlug(await getDb(), params.handle, params.slug);
    if (!detail || detail.isPrivate) return promptOgMetadata(null);
    return promptOgMetadata({ name: detail.name, description: detail.description, image: detail.image });
  } catch {
    return promptOgMetadata(null);
  }
}

export default function NamespacedPromptPage({ params }: { params: { handle: string; slug: string } }) {
  return <NamespacedPromptClient handle={params.handle} slug={params.slug} />;
}
