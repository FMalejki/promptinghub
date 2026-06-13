import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { tagExists } from "@/lib/prompts";
import { TagClient } from "./TagClient";

export function generateMetadata({ params }: { params: { tag: string } }): Metadata {
  const tag = decodeURIComponent(params.tag);
  const title = `#${tag} prompts`;
  const branded = `${title} · PromptingHub`;
  const description = `Browse prompts tagged #${tag} on PromptingHub.`;
  return { title, description, openGraph: { title: branded, description }, twitter: { card: "summary", title: branded, description } };
}

export default async function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  // 404 a tag no prompt uses (typo URLs) rather than a 200 + empty state.
  if (!(await tagExists(await getDb(), tag).catch(() => true))) notFound();
  return <TagClient tag={tag} />;
}
