import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/bearerAuth";
import { getDb } from "@/lib/db";
import { aggregateEvents } from "@/lib/events";

// Token-guarded read of the first-party event stream: top-line counts only
// (totals, by-type, top paths, unique anon visitors). Reuses SEED_ADMIN_TOKEN
// so no new secret is needed. Disabled unless that token is configured.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!process.env.SEED_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Analytics endpoint disabled" }, { status: 404 });
  }
  if (!verifyBearerToken(req.headers.get("authorization"), process.env.SEED_ADMIN_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const days = Math.min(90, Math.max(1, Number(sp.get("days")) || 7));
  const sinceMs = Date.now() - days * 86400_000;

  const db = await getDb();
  const events = await db
    .collection("events")
    .find({ ts: { $gte: sinceMs } }, { projection: { _id: 0, type: 1, path: 1, anonId: 1 } })
    .limit(20000)
    .toArray();

  const agg = aggregateEvents(events as unknown as { type: string; path: string; anonId?: string }[]);
  return NextResponse.json({ windowDays: days, ...agg });
}
