import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { followTag, unfollowTag, isFollowingTag } from "@/lib/tagFollows";

// GET ?tag= → whether the signed-in user follows the tag (false when signed out).
export async function GET(req: Request) {
  const tag = new URL(req.url).searchParams.get("tag") || "";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const following = email ? await isFollowingTag(await getDb(), email, tag) : false;
  return NextResponse.json({ following });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const ok = await followTag(await getDb(), email, body?.tag || "");
  if (!ok) return NextResponse.json({ error: "Cannot follow" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  await unfollowTag(await getDb(), email, body?.tag || "");
  return NextResponse.json({ ok: true });
}
