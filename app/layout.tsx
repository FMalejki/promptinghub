import "./globals.css";
import { Providers } from "./providers";
import { Footer } from "./components/Footer";
import { AnalyticsBeacon } from "./components/AnalyticsBeacon";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { siteJsonLd } from "@/lib/jsonLd";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "PromptingHub", template: "%s · PromptingHub" },
  description: "Discover and share AI prompts",
  alternates: {
    types: {
      "application/opensearchdescription+xml": [{ url: "/opensearch.xml", title: "PromptingHub" }],
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Pre-paint: set the theme class on <html> before first paint so dark-mode
            users never see a flash of the light theme. Must be first in <head>. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd(SITE_URL)) }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 transition-colors">
        <Providers>
          {children}
          <Footer />
        </Providers>
        <AnalyticsBeacon />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
