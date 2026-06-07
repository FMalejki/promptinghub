import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getRelatedPrompts, getRelatedByTags } from "@/lib/prompts";

// Related prompts for the detail page: by category (most-copied) and by tag overlap.
// byTag excludes anything already shown in the category list.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = await getDb();
  const prompts = await getRelatedPrompts(db, params.id);
  const seen = new Set(prompts.map((p) => p.id));
  const byTag = (await getRelatedByTags(db, params.id)).filter((p) => !seen.has(p.id));
  return NextResponse.json({ prompts, byTag });
}
