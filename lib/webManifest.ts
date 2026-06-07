import type { MetadataRoute } from "next";

// PWA web app manifest so PromptingHub is installable / "Add to Home Screen".
// Pure so it can be unit-tested; the app/manifest.ts route returns it.
export function buildWebManifest(): MetadataRoute.Manifest {
  return {
    name: "PromptingHub",
    short_name: "PromptingHub",
    description: "Discover, share, and install AI prompts.",
    start_url: "/browse",
    display: "standalone",
    background_color: "#0b1120",
    theme_color: "#2563eb",
    icons: [
      { src: "/static/image.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/static/image.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/static/image.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
