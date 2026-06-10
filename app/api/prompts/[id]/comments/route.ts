import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addComment, listComments } from "@/lib/comments";
import { getCommentLikes } from "@/lib/commentLikes";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = await getDb();
  const session = await getServerSession(authOptions);
  const comments = await listComments(db, params.id, session?.user?.email ?? undefined);
  const likes = await getCommentLikes(db, comments.map((c) => c.id), session?.user?.email ?? undefined);
  const withLikes = comments.map((c) => ({ ...c, likeCount: likes[c.id]?.count ?? 0, liked: likes[c.id]?.liked ?? false }));
  return NextResponse.json({ comments: withLikes });
}

const bodySchema = z.object({ body: z.string().min(1).max(2000), parentId: z.string().optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Throttle commenting: 12 per user per 5 minutes (anti flood).
  const rl = await rateLimit(await getDb(), `comment:${email}`, 12, 5 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "You're commenting too fast. Please slow down." }, { status: 429 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const created = await addComment(await getDb(), params.id, email, parsed.data.body, parsed.data.parentId ?? null);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
