import type { Metadata } from "next";
import TrendingClient from "./TrendingClient";

export const metadata: Metadata = {
  title: "Trending",
  description: "The AI prompts gaining the most traction right now on PromptingHub.",
};

export default function Page() {
  return <TrendingClient />;
}
