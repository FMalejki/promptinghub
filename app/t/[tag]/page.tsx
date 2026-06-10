import type { Metadata } from "next";
import { TagClient } from "./TagClient";

export function generateMetadata({ params }: { params: { tag: string } }): Metadata {
  const tag = decodeURIComponent(params.tag);
  const title = `#${tag} prompts`;
  const branded = `${title} · PromptingHub`;
  const description = `Browse prompts tagged #${tag} on PromptingHub.`;
  return { title, description, openGraph: { title: branded, description }, twitter: { card: "summary", title: branded, description } };
}

export default function TagPage({ params }: { params: { tag: string } }) {
  return <TagClient tag={decodeURIComponent(params.tag)} />;
}
