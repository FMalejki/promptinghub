import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { reportPrompt } from "@/lib/reports";
import { enforceRateLimit, MIN } from "@/lib/apiRateLimit";

// Signed-in users can flag a prompt for moderation.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(req, "report", 20, 10 * MIN, email);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const result = await reportPrompt(await getDb(), params.id, email, body?.reason || "");
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
