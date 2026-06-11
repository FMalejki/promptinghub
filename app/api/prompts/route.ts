import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listPrompts, createPrompt } from "@/lib/prompts";
import { newPromptSchema } from "@/lib/promptInput";
import { rankBySearch } from "@/lib/search";
import { parseLimit, parseOffset, nextOffset } from "@/lib/pagination";
import { resolveSort } from "@/lib/sort";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const model = url.searchParams.get("model") || undefined;
  const imageOnly = url.searchParams.get("image") === "1";
  const skillsOnly = url.searchParams.get("skill") === "1";
  const tag = url.searchParams.get("tag") || undefined;
  // resolveSort maps aliases (top→popular, hot→trending, …) onto real keys so an
  // unrecognized ?sort= value ranks sensibly instead of silently becoming "recent".
  const sort = resolveSort(url.searchParams.get("sort"));
  const ownerEmail = url.searchParams.get("owner") || undefined;
  const limit = parseLimit(url.searchParams.get("limit"));
  const offset = parseOffset(url.searchParams.get("offset"));

  const db = await getDb();
  const prompts = await listPrompts(db, {
    // When searching, DON'T narrow by `q` at the DB (a substring regex misses
    // typos/fuzzy) — fetch the candidate pool and let rankBySearch filter+rank
    // it in memory below. Other filters (category/tag/…) still apply.
    q: undefined,
    category,
    model,
    imageOnly,
    skillsOnly,
    tag,
    sort,
    ownerEmail,
    includePrivate: !!session?.user?.email,
    userEmail: session?.user?.email || undefined,
    // Search paginates after ranking; everything else paginates at the DB.
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
  try {
    const created = await createPrompt(await getDb(), email, {
      ...parsed.data,
      image: parsed.data.image || undefined,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create prompt";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
