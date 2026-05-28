import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listPrompts, listCategories } from "@/lib/prompts";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const db = await getDb();
  const [prompts, categories] = await Promise.all([
    listPrompts(db, email, { q, category }),
    listCategories(db, email),
  ]);
  return NextResponse.json({ prompts, categories });
}
