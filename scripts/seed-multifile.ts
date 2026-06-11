/**
 * Seed realistic MULTI-FILE persona prompts (orchestration / multi-agent / RAG /
 * eval) so the multi-file tab viewer + "infra as a prompt" story have real content.
 * Idempotent — skips any prompt already present for its author. Original content
 * (defaultSource:null). Owners are existing PASSWORDLESS personas (ns/215 rule).
 *
 * Usage: npm run seed:multifile   (requires MONGODB_URI in .env.local/env)
 */
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import { seedDatabase } from "../lib/seed";
import { MULTIFILE_PROMPTS } from "./seed-data/multifile";

try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* rely on env */
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("✗ MONGODB_URI not set.");
  process.exit(1);
}

async function main() {
  const client = await new MongoClient(uri as string).connect();
  try {
    const db = client.db(process.env.MONGODB_DB || "promptinghub");
    console.log(`Seeding ${MULTIFILE_PROMPTS.length} multi-file prompts (per-prompt persona authors)…`);
    const res = await seedDatabase(db, MULTIFILE_PROMPTS, {
      ownerEmail: "skills@promptinghub.app", // fallback owner; each prompt overrides via authorEmail
      ownerName: "PromptingHub Skills",
      defaultSource: null,
      collections: [],
    });
    console.log("✓ Multi-file seed complete:", res);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("✗ seed:multifile failed:", e);
  process.exit(1);
});
