import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isVerifiedEmail } from "@/lib/users";
import { submitFeedback, listFeedback } from "@/lib/feedback";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const schema = z.object({
  message: z.string().min(1).max(2000),
  category: z.string().max(40).optional(),
  page: z.string().max(200).optional(),
  simulated: z.boolean().optional(),
});

// Submit product feedback. Open to anyone; signed-in users are attributed by email.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const db = await getDb();
  // Throttle feedback: 8 per IP per 10 minutes (anti spam — it's unauthenticated).
  const rl = await rateLimit(db, `feedback:${clientIp(req)}`, 8, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const res = await submitFeedback(db, {
    message: parsed.data.message,
    category: parsed.data.category,
    page: parsed.data.page ?? null,
    email: session?.user?.email ?? null,
    simulated: parsed.data.simulated,
  });
  if (!res) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  return NextResponse.json({ ok: true, id: res.id });
}

// Read feedback — verified maintainers only (mirrors /api/reports gating).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const db = await getDb();
  if (!email || !(await isVerifiedEmail(db, email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const includeSimulated = new URL(req.url).searchParams.get("includeSimulated") === "1";
  return NextResponse.json({ feedback: await listFeedback(db, { includeSimulated }) });
}
