import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { togglePin, getPinnedPromptIds } from "@/lib/pins";

// GET → the signed-in user's pinned prompt ids.
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ pinned: await getPinnedPromptIds(await getDb(), email) });
}

// POST { promptId } → toggle pin (owner only, capped).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const result = await togglePin(await getDb(), email, body?.promptId || "");
  if (!result.ok) {
    const status = result.error === "not_owner" ? 403 : result.error === "max" ? 400 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
