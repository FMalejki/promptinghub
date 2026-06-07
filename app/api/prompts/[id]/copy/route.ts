import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { incrementCopyCount } from "@/lib/prompts";

// Bump the copy/usage counter when someone copies or installs a prompt.
// Public + idempotency-free by design — it's a soft engagement signal, not auth-gated.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const count = await incrementCopyCount(await getDb(), params.id);
  if (count === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ copyCount: count });
}
