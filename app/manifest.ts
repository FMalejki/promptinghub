import type { MetadataRoute } from "next";
import { buildWebManifest } from "@/lib/webManifest";

// Served at /manifest.webmanifest — makes the site installable as a PWA.
export default function manifest(): MetadataRoute.Manifest {
  return buildWebManifest();
}
