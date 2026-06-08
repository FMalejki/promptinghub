import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { AWESOME_PROMPTS } from "@/scripts/seed-data/awesome-prompts";

// Token-guarded admin endpoint to populate prod with the curated CC0 seed set.
// The server has the (sensitive, un-pullable) MONGODB_URI, so this lets an
// operator seed prod over HTTPS without ever handling the raw connection string.
// Disabled unless SEED_ADMIN_TOKEN is set. Idempotent + additive (never deletes).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const expected = process.env.SEED_ADMIN_TOKEN;
  if (!expected) return false; // endpoint is off unless a token is configured
  const header = req.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!process.env.SEED_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Seed endpoint disabled" }, { status: 404 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ownerEmail = "curated@promptinghub.app";
  let ownerName = "PromptingHub Curated";
  try {
    const body = await req.json();
    if (body && typeof body.owner === "string" && body.owner.includes("@")) ownerEmail = body.owner;
    if (body && typeof body.ownerName === "string" && body.ownerName.trim()) ownerName = body.ownerName.trim();
  } catch {
    /* no body — use defaults */
  }

  try {
    const db = await getDb();
    const result = await seedDatabase(db, AWESOME_PROMPTS, { ownerEmail, ownerName });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ error: "Seed failed", detail: String(e) }, { status: 500 });
  }
}
