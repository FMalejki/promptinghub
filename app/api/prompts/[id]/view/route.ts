import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { incrementViewCount } from "@/lib/prompts";

// Bump a prompt's view counter. Public soft engagement signal — not auth-gated.
// The client sends its anonymous id so a refresh / re-open doesn't re-count
// (deduped per viewer per time window server-side).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const viewer = body && typeof body.anonId === "string" ? body.anonId : undefined;
  const count = await incrementViewCount(await getDb(), params.id, { viewer });
  if (count === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ viewCount: count });
}
