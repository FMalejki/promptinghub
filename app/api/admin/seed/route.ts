import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/bearerAuth";
import { getDb } from "@/lib/db";
import { seedDatabase, SEED_SOURCE, type SeedPrompt } from "@/lib/seed";
import { AWESOME_PROMPTS } from "@/scripts/seed-data/awesome-prompts";
import { PRO_PROMPTS } from "@/scripts/seed-data/pro-prompts";
import { COMMUNITY_PROMPTS } from "@/scripts/seed-data/community-prompts";

// Token-guarded admin endpoint to populate prod with the curated CC0 seed set.
// The server has the (sensitive, un-pullable) MONGODB_URI, so this lets an
// operator seed prod over HTTPS without ever handling the raw connection string.
// Disabled unless SEED_ADMIN_TOKEN is set. Idempotent + additive (never deletes).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  return verifyBearerToken(req.headers.get("authorization"), process.env.SEED_ADMIN_TOKEN);
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
  const DATASETS = ["awesome", "pro", "community", "all"] as const;
  type Which = (typeof DATASETS)[number];
  let which: Which = "awesome";
  try {
    const body = await req.json();
    if (body && typeof body.owner === "string" && body.owner.includes("@")) ownerEmail = body.owner;
    if (body && typeof body.ownerName === "string" && body.ownerName.trim()) ownerName = body.ownerName.trim();
    if (body && DATASETS.includes(body.dataset)) which = body.dataset;
  } catch {
    /* no body — use defaults */
  }

  try {
    const db = await getDb();
    const results: Record<string, unknown> = {};
    // CC0 awesome set (carries the awesome-chatgpt-prompts attribution).
    if (which === "awesome" || which === "all") {
      results.awesome = await seedDatabase(db, AWESOME_PROMPTS as SeedPrompt[], {
        ownerEmail,
        ownerName,
        defaultSource: SEED_SOURCE,
      });
    }
    // Original "pro" set — no default attribution (they're original compositions).
    if (which === "pro" || which === "all") {
      results.pro = await seedDatabase(db, PRO_PROMPTS, { ownerEmail, ownerName, defaultSource: null });
    }
    // "community" set — per-prompt "inspired by" attribution, no default.
    if (which === "community" || which === "all") {
      results.community = await seedDatabase(db, COMMUNITY_PROMPTS, { ownerEmail, ownerName, defaultSource: null });
    }
    return NextResponse.json({ ok: true, dataset: which, results });
  } catch (e) {
    return NextResponse.json({ error: "Seed failed", detail: String(e) }, { status: 500 });
  }
}
