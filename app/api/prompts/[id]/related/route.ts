import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getRelatedPrompts, getRelatedByTags, listMoreByAuthor } from "@/lib/prompts";

// Related prompts for the detail page: by category (most-copied), by tag overlap,
// and more from the same author. Each list excludes ids already shown above it.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = await getDb();
  const [prompts, byTagAll, byAuthorAll] = await Promise.all([
    getRelatedPrompts(db, params.id),
    getRelatedByTags(db, params.id),
    listMoreByAuthor(db, params.id),
  ]);
  const seen = new Set(prompts.map((p) => p.id));
  const byTag = byTagAll.filter((p) => !seen.has(p.id));
  byTag.forEach((p) => seen.add(p.id));
  const byAuthor = byAuthorAll.filter((p) => !seen.has(p.id));
  return NextResponse.json({ prompts, byTag, byAuthor });
}
