import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getPromptDetail } from "@/lib/prompts";
import { promptOgMetadata } from "@/lib/meta";
import { PromptDetailClient } from "./PromptDetailClient";

// Server-side metadata so shared links render a rich preview.
// Private prompts get a generic card (no content leak).
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const detail = await getPromptDetail(await getDb(), params.id);
    if (!detail || detail.isPrivate) return promptOgMetadata(null);
    return promptOgMetadata({ name: detail.name, description: detail.description, image: detail.image });
  } catch {
    return promptOgMetadata(null);
  }
}

export default function PromptDetailPage({ params }: { params: { id: string } }) {
  return <PromptDetailClient id={params.id} />;
}
