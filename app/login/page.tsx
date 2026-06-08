import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your PromptingHub account to save, star, and share prompts.",
};

export default function Page() {
  return <LoginClient />;
}
