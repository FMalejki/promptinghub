import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPromptDetailByHandleAndSlug } from "@/lib/prompts";

export async function GET(_req: Request, { params }: { params: { handle: string; slug: string } }) {
  const detail = await getPromptDetailByHandleAndSlug(await getDb(), params.handle, params.slug);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}
