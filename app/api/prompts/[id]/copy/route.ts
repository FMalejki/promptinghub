import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { incrementCopyCount } from "@/lib/prompts";

// Bump the copy/usage counter when someone copies or installs a prompt.
// Public, not auth-gated. The client sends its anonymous id so repeated copies
// by the same person within a window count once (the counter reflects users).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const viewer = body && typeof body.anonId === "string" ? body.anonId : undefined;
  const count = await incrementCopyCount(await getDb(), params.id, { viewer });
  if (count === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ copyCount: count });
}
