import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listPrompts, createPrompt } from "@/lib/prompts";
import { newPromptSchema } from "@/lib/promptInput";
import { rankBySearch } from "@/lib/search";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const model = url.searchParams.get("model") || undefined;
  const imageOnly = url.searchParams.get("image") === "1";
  const tag = url.searchParams.get("tag") || undefined;
  const sort = (url.searchParams.get("sort") as "recent" | "popular" | "copied") || "recent";
  const ownerEmail = url.searchParams.get("owner") || undefined;

  const db = await getDb();
  const prompts = await listPrompts(db, {
    q,
    category,
    model,
    imageOnly,
    tag,
    sort,
    ownerEmail,
    includePrivate: !!session?.user?.email,
    userEmail: session?.user?.email || undefined,
  });

  // When searching, order by relevance (name > tags > description) instead of the default sort.
  const ranked = q ? rankBySearch(q, prompts) : prompts;
  return NextResponse.json({ prompts: ranked });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = newPromptSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const created = await createPrompt(await getDb(), email, {
    ...parsed.data,
    image: parsed.data.image || undefined,
  });
  return NextResponse.json(created, { status: 201 });
}
