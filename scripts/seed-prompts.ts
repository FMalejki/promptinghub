/**
 * Seed the database with curated, openly-licensed (CC0) real prompts + public
 * collections, so /tags and /collections aren't empty. Idempotent — safe to
 * re-run; it skips anything already present for the owner.
 *
 * Usage:
 *   npm run seed:prompts                       # owner defaults to curated@promptinghub.app
 *   npm run seed:prompts -- --owner you@you.com --owner-name "Your Name"
 *
 * Requires MONGODB_URI (read from .env.local if present, or the environment).
 * This does NOT wipe anything — unlike scripts/seed.mjs (the demo seed).
 */
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import { seedDatabase } from "../lib/seed";
import { AWESOME_PROMPTS } from "./seed-data/awesome-prompts";

// Best-effort .env.local loader (no dotenv dependency).
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on the environment */
}

const args = process.argv.slice(2);
const arg = (name: string, def: string): string => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const ownerEmail = arg("--owner", process.env.SEED_OWNER_EMAIL || "curated@promptinghub.app");
const ownerName = arg("--owner-name", "PromptingHub Curated");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("✗ MONGODB_URI not set. Put it in .env.local or the environment.");
  process.exit(1);
}

// Wrapped in an async main() rather than top-level await: tsx compiles this to
// CommonJS, which doesn't support top-level await, so the script broke at parse
// time. The IIFE keeps it runnable locally for seeding test data.
// `mongoUri` is passed in (not closed over) so the `if (!uri)` narrowing above
// reaches it as a plain string — control-flow narrowing doesn't flow into a
// nested function's closure.
async function main(mongoUri: string) {
  const client = await new MongoClient(mongoUri).connect();
  try {
    const db = client.db(process.env.MONGODB_DB || "promptinghub");
    console.log(`Seeding ${AWESOME_PROMPTS.length} prompts as ${ownerEmail}…`);
    const res = await seedDatabase(db, AWESOME_PROMPTS, { ownerEmail, ownerName });
    console.log("✓ Seed complete:", res);
  } finally {
    await client.close();
  }
}

main(uri).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
