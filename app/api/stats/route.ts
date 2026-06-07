import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { siteStats } from "@/lib/siteStats";

export const revalidate = 300; // 5 min

// Public platform totals (prompts / creators / copies). DB-safe.
export async function GET() {
  try {
    const stats = await siteStats(await getDb());
    return NextResponse.json(stats, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ prompts: 0, creators: 0, copies: 0 });
  }
}
