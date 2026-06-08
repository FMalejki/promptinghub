import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { followingFeed } from "@/lib/follows";
import { tagFeed } from "@/lib/tagFollows";

// Prompts the signed-in user follows: ?source=tags → followed-tag feed,
// otherwise the followed-creators feed.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const source = new URL(req.url).searchParams.get("source");
  const prompts = source === "tags" ? await tagFeed(db, email) : await followingFeed(db, email);
  return NextResponse.json({ prompts });
}
