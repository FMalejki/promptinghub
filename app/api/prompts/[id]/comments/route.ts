import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addComment, listComments } from "@/lib/comments";
import { getCommentLikes } from "@/lib/commentLikes";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = await getDb();
  const comments = await listComments(db, params.id);
  const session = await getServerSession(authOptions);
  const likes = await getCommentLikes(db, comments.map((c) => c.id), session?.user?.email ?? undefined);
  const withLikes = comments.map((c) => ({ ...c, likeCount: likes[c.id]?.count ?? 0, liked: likes[c.id]?.liked ?? false }));
  return NextResponse.json({ comments: withLikes });
}

const bodySchema = z.object({ body: z.string().min(1).max(2000), parentId: z.string().optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const created = await addComment(await getDb(), params.id, email, parsed.data.body, parsed.data.parentId ?? null);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
