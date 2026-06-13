import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { incrementViewCount } from "@/lib/prompts";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { ipViewerKey } from "@/lib/idempotency";

// How many view bumps one IP may register per minute. Far above any honest
// browsing rate (one open = one view), but low enough that scripted inflation
// with rotating anonIds can't meaningfully game the engagement-ranked feed.
const VIEW_RL_LIMIT = 40;
const VIEW_RL_WINDOW_MS = 60_000;

// Bump a prompt's view counter. Public soft engagement signal — not auth-gated.
// The client sends its anonymous id so a refresh / re-open doesn't re-count
// (deduped per viewer per time window server-side). A no-id caller falls back to
// an IP-derived dedup key, and a per-IP rate limit bounds rotating-id abuse.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = await getDb();
  const ip = clientIp(req);

  const rl = await rateLimit(db, `view:${ip}`, VIEW_RL_LIMIT, VIEW_RL_WINDOW_MS);
  if (!rl.ok) return NextResponse.json({ rateLimited: true }, { status: 429 });

  const body = await req.json().catch(() => null);
  const viewer = body && typeof body.anonId === "string" ? body.anonId : undefined;
  const count = await incrementViewCount(db, params.id, { viewer, ipKey: ipViewerKey(ip) });
  if (count === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ viewCount: count });
}
