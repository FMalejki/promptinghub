import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCreatorProfile } from "@/lib/users";
import { creatorJsonLd, jsonLdHtml } from "@/lib/jsonLd";
import { CreatorClient } from "./CreatorClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  try {
    const creator = await getCreatorProfile(await getDb(), params.handle);
    if (!creator) return { title: "Creator" };
    // Page <title> is bare — the root layout template appends "· PromptingHub".
    // OG/twitter titles are NOT templated, so they carry the brand explicitly.
    const title = `${creator.name} (@${creator.handle})`;
    const branded = `${title} · PromptingHub`;
    const description = `Prompts by ${creator.name} on PromptingHub.`;
    return {
      title,
      description,
      openGraph: { title: branded, description, type: "profile", images: creator.image ? [{ url: creator.image }] : undefined },
      twitter: { card: "summary", title: branded, description },
    };
  } catch {
    return { title: "Creator" };
  }
}

async function creatorLdJson(handle: string): Promise<string | null> {
  try {
    const creator = await getCreatorProfile(await getDb(), handle);
    return creator ? jsonLdHtml(creatorJsonLd(creator, SITE_URL)) : null;
  } catch {
    return null;
  }
}

export default async function CreatorPage({ params }: { params: { handle: string } }) {
  // Real 404 for an unknown handle instead of a 200 + client empty state.
  const creator = await getCreatorProfile(await getDb(), params.handle).catch(() => null);
  if (!creator) notFound();

  const ld = await creatorLdJson(params.handle);
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
      <CreatorClient handle={params.handle} />
    </>
  );
}
