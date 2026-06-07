import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getRelatedPrompts } from "@/lib/prompts";

// Public prompts in the same category, most-copied first. Used by the detail page.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prompts = await getRelatedPrompts(await getDb(), params.id);
  return NextResponse.json({ prompts });
}
