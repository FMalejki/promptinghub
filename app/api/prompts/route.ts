import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listPrompts, listCategories, createPrompt } from "@/lib/prompts";
import { newPromptSchema } from "@/lib/promptInput";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const db = await getDb();
  const [prompts, categories] = await Promise.all([listPrompts(db, { q, category }), listCategories(db)]);
  return NextResponse.json({ prompts, categories });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = newPromptSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const created = await createPrompt(await getDb(), email, parsed.data);
  return NextResponse.json(created, { status: 201 });
}
