import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { topCreators } from "@/lib/users";
import { parseLimit, parseOffset, nextOffset } from "@/lib/pagination";

// Paginated leaderboard for the /creators "Load more" control. Public, no auth.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit")) ?? 24;
  const offset = parseOffset(url.searchParams.get("offset"));

  try {
    const creators = await topCreators(await getDb(), limit, offset);
    return NextResponse.json({ creators, nextOffset: nextOffset(creators.length, limit, offset) });
  } catch {
    return NextResponse.json({ creators: [], nextOffset: null });
  }
}
