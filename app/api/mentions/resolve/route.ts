import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getUsersByHandles } from "@/lib/users";

// Confirms which @handles in a draft comment map to real users, so the composer
// can show a "✓ @handle will be notified" indicator. Auth-gated (same as the
// typeahead) to avoid a public user-enumeration endpoint. Returns public-safe
// fields only (handle, name, image).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = (new URL(req.url).searchParams.get("handles") || "").slice(0, 400);
  const handles = raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => /^[a-z0-9_-]+$/.test(h))
    .slice(0, 20);
  if (handles.length === 0) return NextResponse.json({ users: [] });

  const users = await getUsersByHandles(await getDb(), handles);
  return NextResponse.json({ users });
}
