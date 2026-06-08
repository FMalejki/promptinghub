import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { categoryCounts } from "@/lib/categoryCounts";

export const revalidate = 300;

// Public per-category prompt counts. Used by /browse to hide empty category
// pills and show an honest total. DB-safe — falls back to empty on error.
export async function GET() {
  try {
    const counts = await categoryCounts(await getDb());
    return NextResponse.json(
      { counts },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ counts: {} });
  }
}
