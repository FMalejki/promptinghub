import { buildOpenSearch } from "@/lib/opensearch";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const revalidate = 86400; // static; refresh daily

// OpenSearch description so browsers can add PromptingHub as a search engine.
export async function GET() {
  return new Response(buildOpenSearch(SITE_URL), {
    headers: {
      "Content-Type": "application/opensearchdescription+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
