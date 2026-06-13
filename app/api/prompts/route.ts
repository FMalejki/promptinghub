import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listPrompts, createPrompt, getPromptEmbeddings, setPromptEmbedding } from "@/lib/prompts";
import { newPromptSchema } from "@/lib/promptInput";
import { hybridRank } from "@/lib/semanticSearch";
import { embedText, embedTextWithTimeout, embeddingTextFor } from "@/lib/embeddings";
import { parseLimit, parseOffset, nextOffset } from "@/lib/pagination";
import { resolveSort } from "@/lib/sort";
import { enforceRateLimit, MIN } from "@/lib/apiRateLimit";

// Allow the local-embedding model time to cold-load on the first search after a
// container spins up; warm requests return in milliseconds.
export const maxDuration = 30;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const model = url.searchParams.get("model") || undefined;
  const imageOnly = url.searchParams.get("image") === "1";
  const skillsOnly = url.searchParams.get("skill") === "1";
  const useWith = url.searchParams.get("useWith") || undefined;
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
    useWith,
    tag,
    sort,
    ownerEmail,
    includePrivate: !!session?.user?.email,
    userEmail: session?.user?.email || undefined,
    // Search paginates after ranking; everything else paginates at the DB.
    ...(q ? {} : { limit, skip: offset }),
  });

  // When searching, rank by relevance: keyword score (name > tags > description)
  // blended with semantic (embedding) similarity so "po znaczeniu" queries surface
  // prompts that mean the same thing even without shared words. The query embedding
  // is computed locally + free; if it isn't ready in time, hybridRank collapses to
  // pure keyword ranking, so search never blocks or regresses.
  let ranked = prompts;
  if (q) {
    const [queryEmbedding, embById] = await Promise.all([
      embedTextWithTimeout(q),
      getPromptEmbeddings(db, prompts.map((p) => p.id)),
    ]);
    ranked = hybridRank(q, prompts, queryEmbedding, embById);
    if (limit !== undefined) ranked = ranked.slice(offset, offset + limit);
  }

  return NextResponse.json({ prompts: ranked, nextOffset: nextOffset(ranked.length, limit, offset) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Throttle prompt creation to curb spam/flooding (per signed-in user).
  const limited = await enforceRateLimit(req, "prompt-create", 30, 10 * MIN, email);
  if (limited) return limited;
  const parsed = newPromptSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const db = await getDb();
    const created = await createPrompt(db, email, {
      ...parsed.data,
      image: parsed.data.image || undefined,
    });
    // Best-effort semantic embedding so the new prompt is findable "by meaning"
    // immediately. Never blocks/fails the create — backfill covers any miss.
    try {
      const vec = await embedText(
        embeddingTextFor({ name: parsed.data.name, description: parsed.data.description, tags: parsed.data.tags }),
      );
      if (vec) await setPromptEmbedding(db, created.id, vec);
    } catch {
      /* embedding is optional */
    }
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create prompt";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
