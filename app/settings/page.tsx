import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your PromptingHub profile and account settings.",
};

export default function Page() {
  return <SettingsClient />;
}
