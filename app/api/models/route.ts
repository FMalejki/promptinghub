import { NextResponse } from "next/server";
import { fetchModels } from "@/lib/models";

// Live model catalogue (OpenRouter merged over the curated fallback). Cached a
// day at the data layer; we also let the CDN cache the response.
export async function GET() {
  const models = await fetchModels();
  return NextResponse.json(
    { models },
    { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
