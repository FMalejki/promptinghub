import type { Metadata } from "next";
import { CategoryClient } from "./CategoryClient";

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const category = decodeURIComponent(params.category);
  const title = `${category} prompts · PromptingHub`;
  const description = `Browse the best ${category} prompts on PromptingHub.`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary", title, description } };
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  return <CategoryClient category={decodeURIComponent(params.category)} />;
}
