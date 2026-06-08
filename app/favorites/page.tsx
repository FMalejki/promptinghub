import type { Metadata } from "next";
import FavoritesClient from "./FavoritesClient";

export const metadata: Metadata = {
  title: "Favorites",
  description: "The prompts you've starred on PromptingHub, all in one place.",
};

export default function Page() {
  return <FavoritesClient />;
}
