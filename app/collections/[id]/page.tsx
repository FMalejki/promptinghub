import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCollection } from "@/lib/collections";
import { CollectionDetailClient } from "./CollectionDetailClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

// Server-side metadata so a shared collection link renders a rich preview instead
// of the generic site card. Collections are public, so the name/description are
// safe to expose.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const c = await getCollection(await getDb(), params.id);
    if (!c) return { title: "Collection" };
    const title = c.name;
    const branded = `${c.name} · PromptingHub`;
    const description = c.description || `A curated collection of prompts on PromptingHub.`;
    return {
      title,
      description,
      alternates: { canonical: `${SITE_URL}/collections/${c.id}` },
      openGraph: { title: branded, description, type: "website", url: `${SITE_URL}/collections/${c.id}` },
      twitter: { card: "summary", title: branded, description },
    };
  } catch {
    return { title: "Collection" };
  }
}

export default async function CollectionPage({ params }: { params: { id: string } }) {
  // Real 404 for a missing collection instead of a 200 that client-redirects to /browse.
  const exists = await getCollection(await getDb(), params.id).catch(() => null);
  if (!exists) notFound();

  return <CollectionDetailClient id={params.id} />;
}
