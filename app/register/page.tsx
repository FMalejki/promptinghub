import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join PromptingHub to publish your own AI prompts and follow what works.",
};

export default function Page() {
  return <RegisterClient />;
}
