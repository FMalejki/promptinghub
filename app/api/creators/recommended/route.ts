import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { recommendCreators } from "@/lib/follows";

// "You might also like" — creator suggestions for the (optional) signed-in
// viewer, excluding an optional ?exclude=<handle> (e.g. the page being viewed).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const exclude = new URL(req.url).searchParams.get("exclude");
  const db = await getDb();
  let creators = await recommendCreators(db, session?.user?.email ?? undefined, 7);
  if (exclude) creators = creators.filter((c) => c.handle !== exclude);
  return NextResponse.json({ creators: creators.slice(0, 6) });
}
