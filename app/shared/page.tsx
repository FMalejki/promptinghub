import type { Metadata } from "next";
import SharedClient from "./SharedClient";

export const metadata: Metadata = {
  title: "Shared with me",
  description: "Locked prompts that other creators have shared with you on PromptingHub.",
};

export default function Page() {
  return <SharedClient />;
}
