import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { searchUsersForMention } from "@/lib/users";

// Typeahead for @mention autocomplete in the comment box. Auth-gated (only
// signed-in users compose comments) to avoid exposing a public user-enumeration
// endpoint. Returns public-safe fields only (handle, name, image).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Cap length before it ever reaches a RegExp (defensive against ReDoS surface).
  const q = (new URL(req.url).searchParams.get("q") || "").slice(0, 64);
  if (q.trim().length < 1) return NextResponse.json({ users: [] });

  const users = await searchUsersForMention(await getDb(), q, 6);
  return NextResponse.json({ users });
}
