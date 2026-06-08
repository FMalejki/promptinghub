import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage the prompts you've published on PromptingHub.",
};

export default function Page() {
  return <DashboardClient />;
}
