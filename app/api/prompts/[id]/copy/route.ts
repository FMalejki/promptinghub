import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { incrementCopyCount } from "@/lib/prompts";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { ipViewerKey } from "@/lib/idempotency";

// Per-IP cap on copy bumps. Copies weigh more in engagementScore than views, so
// keep the cap tighter — still well above any honest copy rate.
const COPY_RL_LIMIT = 20;
const COPY_RL_WINDOW_MS = 60_000;

// Bump the copy/usage counter when someone copies or installs a prompt.
// Public, not auth-gated. The client sends its anonymous id so repeated copies
// by the same person within a window count once (the counter reflects users).
// A no-id caller falls back to an IP-derived dedup key, and a per-IP rate limit
// bounds rotating-id abuse of this engagement signal.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = await getDb();
  const ip = clientIp(req);

  const rl = await rateLimit(db, `copy:${ip}`, COPY_RL_LIMIT, COPY_RL_WINDOW_MS);
  if (!rl.ok) return NextResponse.json({ rateLimited: true }, { status: 429 });

  const body = await req.json().catch(() => null);
  const viewer = body && typeof body.anonId === "string" ? body.anonId : undefined;
  const count = await incrementCopyCount(db, params.id, { viewer, ipKey: ipViewerKey(ip) });
  if (count === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ copyCount: count });
}
