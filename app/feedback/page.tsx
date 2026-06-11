import type { Metadata } from "next";
import FeedbackClient from "./FeedbackClient";

export const metadata: Metadata = {
  title: "Send feedback",
  description: "Tell us what's working, what's confusing, or what you'd love to see on PromptingHub.",
};

export default function Page() {
  return <FeedbackClient />;
}
