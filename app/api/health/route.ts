import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { healthPayload, healthStatus } from "@/lib/health";

export const dynamic = "force-dynamic";

// Liveness/readiness probe for uptime monitors: pings MongoDB and reports status.
// 200 when healthy, 503 when the DB is unreachable.
export async function GET() {
  let dbOk = false;
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return NextResponse.json(healthPayload(dbOk), {
    status: healthStatus(dbOk),
    headers: { "Cache-Control": "no-store" },
  });
}
