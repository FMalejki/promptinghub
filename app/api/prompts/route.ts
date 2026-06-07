import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listPrompts, createPrompt } from "@/lib/prompts";
import { newPromptSchema } from "@/lib/promptInput";
import { rankBySearch } from "@/lib/search";
import { parseLimit, parseOffset, nextOffset } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const model = url.searchParams.get("model") || undefined;
  const imageOnly = url.searchParams.get("image") === "1";
  const tag = url.searchParams.get("tag") || undefined;
  const sort = (url.searchParams.get("sort") as "recent" | "popular" | "copied" | "viewed") || "recent";
  const ownerEmail = url.searchParams.get("owner") || undefined;
  const limit = parseLimit(url.searchParams.get("limit"));
  const offset = parseOffset(url.searchParams.get("offset"));

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
    // Search re-ranks in-memory below, so it needs the full set — paginate it
    // after ranking. Everything else paginates at the DB.
    ...(q ? {} : { limit, skip: offset }),
  });

  // When searching, order by relevance (name > tags > description) instead of the default sort.
  let ranked = q ? rankBySearch(q, prompts) : prompts;
  if (q && limit !== undefined) ranked = ranked.slice(offset, offset + limit);

  return NextResponse.json({ prompts: ranked, nextOffset: nextOffset(ranked.length, limit, offset) });
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
