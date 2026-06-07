import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep auth + write surfaces out of the index.
      disallow: ["/api/", "/settings", "/new", "/login"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
