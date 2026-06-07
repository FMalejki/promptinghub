import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isVerifiedEmail } from "@/lib/users";
import { approveDraft, dismissDraft } from "@/lib/ingest";

// POST = approve (publish as your prompt); DELETE = dismiss. Verified curators only.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  if (!(await isVerifiedEmail(db, email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const res = await approveDraft(db, params.id, email);
  if (!res) return NextResponse.json({ error: "Not found or already handled" }, { status: 404 });
  return NextResponse.json(res, { status: 201 });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  if (!(await isVerifiedEmail(db, email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ok = await dismissDraft(db, params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
