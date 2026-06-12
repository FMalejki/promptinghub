import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { searchTags, topTags } from "@/lib/prompts";
import { parseLimit, parseOffset, nextOffset } from "@/lib/pagination";

// GET /api/tags?q=se        → tag autocomplete (public tags matching the substring).
// GET /api/tags?limit=&offset= → paginated tag cloud ({ tags, nextOffset }).
// No params → the most-used tags. DB-safe.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  try {
    const db = await getDb();
    if (q.trim()) {
      // Autocomplete branch — unchanged contract for the @tag typeahead.
      return NextResponse.json({ tags: await searchTags(db, q) });
    }
    const limit = parseLimit(url.searchParams.get("limit")) ?? 10;
    const offset = parseOffset(url.searchParams.get("offset"));
    const tags = await topTags(db, limit, offset);
    return NextResponse.json({ tags, nextOffset: nextOffset(tags.length, limit, offset) });
  } catch {
    return NextResponse.json({ tags: [], nextOffset: null });
  }
}
