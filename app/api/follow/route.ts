import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { followCreator, unfollowCreator, isFollowing, countFollowers } from "@/lib/follows";
import { enforceRateLimit, MIN } from "@/lib/apiRateLimit";

// GET ?handle= → follow status + follower count (following is false when signed out).
export async function GET(req: Request) {
  const handle = new URL(req.url).searchParams.get("handle") || "";
  const db = await getDb();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const following = email ? await isFollowing(db, email, handle) : false;
  return NextResponse.json({ following, followers: await countFollowers(db, handle) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(req, "follow", 60, 10 * MIN, email);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const ok = await followCreator(await getDb(), email, body?.handle || "");
  if (!ok) return NextResponse.json({ error: "Cannot follow" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  await unfollowCreator(await getDb(), email, body?.handle || "");
  return NextResponse.json({ ok: true });
}
