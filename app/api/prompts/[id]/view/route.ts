import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { incrementViewCount } from "@/lib/prompts";

// Bump a prompt's view counter. Public soft engagement signal — not auth-gated.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const count = await incrementViewCount(await getDb(), params.id);
  if (count === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ viewCount: count });
}
