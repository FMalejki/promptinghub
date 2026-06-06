import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPromptDetail } from "@/lib/prompts";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const detail = await getPromptDetail(await getDb(), params.id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}
