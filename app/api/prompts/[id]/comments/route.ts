import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addComment, listComments } from "@/lib/comments";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const comments = await listComments(await getDb(), params.id);
  return NextResponse.json({ comments });
}

const bodySchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const created = await addComment(await getDb(), params.id, email, parsed.data.body);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
