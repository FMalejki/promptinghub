import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ownerAnalytics, activityTimeseries } from "@/lib/analytics";

// Usage stats for the signed-in user's own prompts.
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const analytics = await ownerAnalytics(db, email);
  // Per-day copies AND views; the dashboard derives "activity" (copies + views)
  // or either metric alone via its selector.
  const series = await activityTimeseries(db, email, 14);
  return NextResponse.json({ ...analytics, series });
}
