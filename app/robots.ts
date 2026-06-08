import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

// Personal / auth-gated / write surfaces that hold no indexable public content.
// Each entry is a distinct path prefix chosen to avoid collisions with public
// routes — e.g. we use "/new" not "/n", and deliberately omit a bare "/feed"
// so the public RSS at /feed.xml stays crawlable.
export const DISALLOW = [
  "/api/",
  "/login",
  "/register",
  "/new",
  "/settings",
  "/dashboard",
  "/favorites",
  "/following",
  "/notifications",
  "/profile",
  "/moderation",
  "/curate",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOW,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
