import type { Metadata } from "next";
import BrowseClient from "./BrowseClient";

export const metadata: Metadata = {
  title: "Browse prompts",
  description: "Explore AI prompts by category, tag, and popularity on PromptingHub.",
};

export default function Page() {
  return <BrowseClient />;
}
