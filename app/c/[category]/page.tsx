import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { categoryExists } from "@/lib/prompts";
import { CategoryClient } from "./CategoryClient";

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const category = decodeURIComponent(params.category);
  const title = `${category} prompts`;
  const branded = `${title} · PromptingHub`;
  const description = `Browse the best ${category} prompts on PromptingHub.`;
  return { title, description, openGraph: { title: branded, description }, twitter: { card: "summary", title: branded, description } };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const category = decodeURIComponent(params.category);
  // 404 a category no prompt uses (typo URLs) rather than a 200 + empty state.
  if (!(await categoryExists(await getDb(), category).catch(() => true))) notFound();
  return <CategoryClient category={category} />;
}
