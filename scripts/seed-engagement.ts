/**
 * "Looks alive" engagement seed. Gives seeded prompts a realistic long-tail of
 * stars (from existing persona accounts) + modest copy counts so the catalog
 * doesn't read as dead at launch. Deterministic + IDEMPOTENT: re-running yields
 * the same target state, unioned with any REAL stars and max() of copy counts —
 * so genuine engagement is never reduced. Additive only; never deletes.
 *
 * Usage: npm run seed:engagement      (requires MONGODB_URI in .env.local/env)
 */
import { readFileSync } from "node:fs";
import { MongoClient, type Db } from "mongodb";
import { engagementFor } from "../lib/engagementSeed";
import { slugify } from "../lib/slug";

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

// Accounts that should NOT act as starrers (QA/test bots + the flagged real one).
const JUNK = /(^|[+_-])(uxbot|rltest|sectest|ratetest)|wierzba@/i;

// Backfill handles for SEEDED authors (@promptinghub.app) that lack one, so their
// cards show a real creator instead of "?". Only touches seeded accounts — never
// real signups. Derives a unique handle from the display name (or email local part).
async function ensureSeededAuthorsHaveHandles(db: Db): Promise<void> {
  const users = await db
    .collection("users")
    .find({ email: { $regex: /@promptinghub\.app$/i }, $or: [{ handle: { $exists: false } }, { handle: null }, { handle: "" }] })
    .toArray();
  let fixed = 0;
  for (const u of users) {
    const email = u.email as string;
    const base = slugify(u.name || email.split("@")[0]) || "creator";
    let handle = base;
    for (let i = 2; await db.collection("users").findOne({ handle }); i++) handle = `${base}-${i}`;
    await db.collection("users").updateOne(
      { email },
      { $set: { handle, name: u.name || email.split("@")[0] } },
    );
    fixed++;
  }
  if (fixed) console.log(`✓ backfilled handles for ${fixed} seeded author(s) so cards show a creator`);
}

async function main() {
  const client = await new MongoClient(uri as string).connect();
  try {
    const db = client.db(process.env.MONGODB_DB || "promptinghub");
    await ensureSeededAuthorsHaveHandles(db);

    const personaEmails = (await db.collection("users").find({ handle: { $exists: true, $ne: null } }).project({ email: 1 }).toArray())
      .map((u) => (u.email as string) || "")
      .filter((e) => e && !JUNK.test(e));
    console.log(`persona starrer pool: ${personaEmails.length}`);

    const prompts = await db
      .collection("prompts")
      .find({ isPrivate: { $ne: true } })
      .project({ _id: 1, ownerEmail: 1, starredBy: 1, copyCount: 1 })
      .toArray();

    let touched = 0;
    const ops: any[] = [];
    for (const p of prompts) {
      const owner = (p.ownerEmail as string) || "";
      if (JUNK.test(owner)) continue; // don't inflate test-junk prompts
      const pool = personaEmails.filter((e) => e !== owner); // can't star your own
      const { starrers, copies } = engagementFor(p._id.toString(), pool);
      if (!starrers.length && !copies) continue;
      ops.push({
        updateOne: {
          filter: { _id: p._id },
          update: [
            {
              $set: {
                starredBy: { $setUnion: [{ $ifNull: ["$starredBy", []] }, starrers] },
                copyCount: { $max: [{ $ifNull: ["$copyCount", 0] }, copies] },
              },
            },
          ],
        },
      });
      touched++;
    }
    if (ops.length) await db.collection("prompts").bulkWrite(ops, { ordered: false });
    console.log(`✓ engagement applied to ${touched}/${prompts.length} public prompts (idempotent, additive)`);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("✗ seed:engagement failed:", e);
  process.exit(1);
});
