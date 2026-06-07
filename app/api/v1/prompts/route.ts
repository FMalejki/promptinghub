import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyApiKey } from "@/lib/apiKeys";
import { listPrompts } from "@/lib/prompts";

// Programmatic API: authenticate with `Authorization: Bearer ph_...`.
// Returns the calling key owner's prompts (including their private ones).
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const db = await getDb();
  const owner = await verifyApiKey(db, key);
  if (!owner) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  const prompts = await listPrompts(db, { ownerEmail: owner, includePrivate: true, userEmail: owner });
  return NextResponse.json({ owner, count: prompts.length, prompts });
}
