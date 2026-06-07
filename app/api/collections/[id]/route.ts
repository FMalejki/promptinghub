import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getCollectionDetail, addPromptToCollection, removePromptFromCollection, deleteCollection } from "@/lib/collections";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const detail = await getCollectionDetail(await getDb(), params.id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}

const patchSchema = z.object({
  action: z.enum(["add", "remove"]),
  promptId: z.string().min(1),
});

// Add/remove a prompt — owner only.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const db = await getDb();
  const ok =
    parsed.data.action === "add"
      ? await addPromptToCollection(db, params.id, email, parsed.data.promptId)
      : await removePromptFromCollection(db, params.id, email, parsed.data.promptId);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await deleteCollection(await getDb(), params.id, email);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
