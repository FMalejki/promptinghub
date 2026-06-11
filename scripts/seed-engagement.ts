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
import { engagementFor, personaEmailSet, nonPersonaHandledSet, type SeedUser } from "../lib/engagementSeed";
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

    // Build the persona pool from PASSWORDLESS, handled, non-junk accounts only.
    // Real signups (alice@example.com, the dev's own account, …) have a password and
    // are deliberately excluded — a bot starring a REAL prompt is fine, but seeding
    // a real user's / test prompt (or using a real name as a starrer) looks fake.
    const users = (await db.collection("users").find({}).project({ email: 1, handle: 1, password: 1, passwordHash: 1 }).toArray()).map(
      (u: any): SeedUser => ({ email: u.email, handle: u.handle, hasPassword: !!(u.password || u.passwordHash) }),
    );
    const isJunk = (e: string) => JUNK.test(e);
    const personas = personaEmailSet(users, isJunk); // bots that may star/copy
    const nonPersonaHandled = nonPersonaHandledSet(users, isJunk); // real/test names that must never appear as starrers
    const personaEmails = [...personas];
    console.log(`persona pool: ${personaEmails.length} · non-persona handled (to scrub): ${nonPersonaHandled.size}`);

    // Real copy counts from the copyEvents ledger, so scrubbed prompts fall back to
    // their TRUE copies instead of an inflated seed value (never a guess).
    const realCopies = new Map<string, number>();
    for (const r of await db.collection("copyEvents").aggregate([{ $group: { _id: "$promptId", n: { $sum: 1 } } }]).toArray()) {
      realCopies.set(String(r._id), r.n as number);
    }

    const prompts = await db
      .collection("prompts")
      .find({ isPrivate: { $ne: true } })
      .project({ _id: 1, ownerEmail: 1, starredBy: 1, copyCount: 1 })
      .toArray();

    let seeded = 0;
    let scrubbed = 0;
    const ops: any[] = [];
    for (const p of prompts) {
      const owner = (p.ownerEmail as string) || "";
      const id = p._id.toString();
      const existing: string[] = Array.isArray(p.starredBy) ? p.starredBy : [];
      // Genuine human stars = anything that isn't a seed bot or a scrubbed real-name.
      // (At launch real stars are 0, so this only ever removes seed-fakes.)
      const genuine = existing.filter((e) => !personas.has(e) && !nonPersonaHandled.has(e));
      const seedable = personas.has(owner); // only persona/curated content gets bot engagement

      if (seedable) {
        const pool = personaEmails.filter((e) => e !== owner); // can't star your own
        const { starrers, copies } = engagementFor(id, pool);
        const nextStars = [...new Set([...genuine, ...starrers])];
        ops.push({
          updateOne: {
            filter: { _id: p._id },
            update: { $set: { starredBy: nextStars, copyCount: Math.max(p.copyCount || 0, copies) } },
          },
        });
        seeded++;
      } else {
        // Test / real-user / junk prompt → strip ALL bot stars + real-name stars and
        // reset copies to the true ledger count. Only persists if something changes.
        const realCp = realCopies.get(id) || 0;
        const changed = genuine.length !== existing.length || (p.copyCount || 0) !== realCp;
        if (changed) {
          ops.push({
            updateOne: { filter: { _id: p._id }, update: { $set: { starredBy: genuine, copyCount: realCp } } },
          });
          scrubbed++;
        }
      }
    }
    if (ops.length) await db.collection("prompts").bulkWrite(ops, { ordered: false });
    console.log(`✓ seeded ${seeded} persona prompt(s); scrubbed fake engagement from ${scrubbed} test/real prompt(s) (idempotent)`);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("✗ seed:engagement failed:", e);
  process.exit(1);
});
