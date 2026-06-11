import "./globals.css";
import { Providers } from "./providers";
import { Footer } from "./components/Footer";
import { AnalyticsBeacon } from "./components/AnalyticsBeacon";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { siteJsonLd } from "@/lib/jsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "PromptingHub", template: "%s · PromptingHub" },
  description: "Discover and share AI prompts",
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: "PromptingHub — Trending prompts" }],
      "application/feed+json": [{ url: "/feed.json", title: "PromptingHub — Trending prompts" }],
      "application/opensearchdescription+xml": [{ url: "/opensearch.xml", title: "PromptingHub" }],
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
