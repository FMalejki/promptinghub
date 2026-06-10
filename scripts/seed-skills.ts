/**
 * Seed PromptingHub with original, agent-ready "skills" (isSkill=true) so the
 * /browse?skill=1 filter has real content. Idempotent — re-running skips any
 * skill already present for its author. Original content (no third-party copy),
 * so defaultSource is null (no false attribution); no collections are created.
 *
 * Usage:
 *   npm run seed:skills
 *
 * Requires MONGODB_URI (from .env.local or the environment). Additive only —
 * never deletes anything.
 */
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import { seedDatabase } from "../lib/seed";
import { SKILLS } from "./seed-data/skills";

// Best-effort .env.local loader (no dotenv dependency).
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on the environment */
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("✗ MONGODB_URI not set. Put it in .env.local or the environment.");
  process.exit(1);
}

// Wrapped in an async IIFE so the script runs under tsx's CJS output (no
// top-level await).
async function main() {
  const client = await new MongoClient(uri as string).connect();
  try {
    const db = client.db(process.env.MONGODB_DB || "promptinghub");
    console.log(`Seeding ${SKILLS.length} skills (per-prompt authors)…`);
    const res = await seedDatabase(db, SKILLS, {
      ownerEmail: "skills@promptinghub.app",
      ownerName: "PromptingHub Skills",
      defaultSource: null, // original content — do not attribute to the CC0 batch
      collections: [], // skills don't create the awesome-prompts collections
    });
    console.log("✓ Skills seed complete:", res);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("✗ Seed failed:", e);
  process.exit(1);
});
