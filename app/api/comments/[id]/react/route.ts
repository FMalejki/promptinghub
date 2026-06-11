import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toggleCommentReaction } from "@/lib/commentReactions";

// POST { emoji } → toggle the signed-in user's emoji reaction on a comment.
// Returns the comment's full reaction state { counts, mine }.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const emoji = body?.emoji;
  const result = await toggleCommentReaction(await getDb(), params.id, email, emoji);
  if (!result) return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  return NextResponse.json(result);
}
