import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listPrompts } from "@/lib/prompts";
import { pickOfTheDay } from "@/lib/promptOfDay";

// One deterministic "prompt of the day", rotating daily across the public catalog.
export async function GET() {
  const db = await getDb();
  const prompts = await listPrompts(db);
  // Stable ordering so the pick depends only on the date, not Mongo's return order.
  const sorted = [...prompts].sort((a, b) => a.id.localeCompare(b.id));
  const pick = pickOfTheDay(sorted, new Date());
  if (!pick) return NextResponse.json({ prompt: null });
  return NextResponse.json({ prompt: pick });
}
