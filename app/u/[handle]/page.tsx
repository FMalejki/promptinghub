import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getCreatorProfile } from "@/lib/users";
import { CreatorClient } from "./CreatorClient";

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  try {
    const creator = await getCreatorProfile(await getDb(), params.handle);
    if (!creator) return { title: "Creator · PromptingHub" };
    const title = `${creator.name} (@${creator.handle}) · PromptingHub`;
    const description = `Prompts by ${creator.name} on PromptingHub.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "profile", images: creator.image ? [{ url: creator.image }] : undefined },
      twitter: { card: "summary", title, description },
      alternates: { types: { "application/rss+xml": `/u/${creator.handle}/feed.xml` } },
    };
  } catch {
    return { title: "Creator · PromptingHub" };
  }
}

export default function CreatorPage({ params }: { params: { handle: string } }) {
  return <CreatorClient handle={params.handle} />;
}
