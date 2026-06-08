import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPrompt, getPromptDetail, updatePrompt, deletePrompt } from "@/lib/prompts";
import { newPromptSchema } from "@/lib/promptInput";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const db = await getDb();

  // Fetch with body/owner info to enforce privacy gate.
  const prompt = await getPrompt(db, params.id);
  if (!prompt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check if user has access to private prompt
  if (prompt.isPrivate) {
    const userEmail = session?.user?.email;
    const hasAccess =
      userEmail === prompt.ownerEmail ||
      prompt.sharedWith.includes(userEmail || "");

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  // Return the rich detail object (files, image, stars, testedModels, author, handle/slug).
  const detail = await getPromptDetail(db, params.id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = newPromptSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { message, ...data } = parsed.data;
  const ok = await updatePrompt(await getDb(), params.id, email, { ...data, image: data.image || undefined }, { message });
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await deletePrompt(await getDb(), params.id, email);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
