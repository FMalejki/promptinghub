import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { searchTags, topTags } from "@/lib/prompts";

// GET /api/tags?q=se → tag autocomplete (public tags matching the substring).
// No query → the most-used tags. DB-safe.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  try {
    const db = await getDb();
    const tags = q.trim() ? await searchTags(db, q) : await topTags(db, 10);
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
