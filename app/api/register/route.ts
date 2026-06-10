import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { createUser } from "@/lib/users";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  const db = await getDb();
  // Throttle signups: 5 per IP per 10 minutes (anti mass account creation).
  const rl = await rateLimit(db, `register:${clientIp(req)}`, 5, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const user = await createUser(db, parsed.data.email, parsed.data.password, parsed.data.name);
    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
