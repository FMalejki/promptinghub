import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { deleteComment } from "@/lib/comments";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await deleteComment(await getDb(), params.id, email);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
