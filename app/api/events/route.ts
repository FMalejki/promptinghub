import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { validateEvent } from "@/lib/events";

// First-party event ingest. Anonymous (no auth) but privacy-preserving:
// - the SERVER stamps `ts`; client clocks/IP/email are never stored,
// - `path` and `props` are sanitized + PII-gated in validateEvent,
// - events expire via a TTL index (90 days) so nothing accumulates forever,
// - rate-limited per IP (the IP is used ONLY for the limiter key, never written).
// Fails OPEN-ish: any storage hiccup returns 204 so the beacon never breaks a page.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_DAYS = 90;
let indexReady: Promise<unknown> | null = null;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const parsed = validateEvent(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 422 });

  try {
    const db = await getDb();
    // Per-IP fixed window: 120 events / minute. IP is the limiter key only.
    const rl = await rateLimit(db, `events:${clientIp(req)}`, 120, 60_000);
    if (!rl.ok) return new NextResponse(null, { status: 429 });

    if (!indexReady) {
      indexReady = db
        .collection("events")
        .createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })
        .catch(() => {
          indexReady = null;
        });
    }
    await indexReady;

    await db.collection("events").insertOne({
      ...parsed.event,
      createdAt: new Date(parsed.event.ts),
      expireAt: new Date(parsed.event.ts + TTL_DAYS * 86400_000),
    });
  } catch {
    // Never let analytics failures surface to the user.
    return new NextResponse(null, { status: 204 });
  }
  return new NextResponse(null, { status: 204 });
}
