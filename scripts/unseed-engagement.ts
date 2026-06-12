/**
 * REMOVE the "looks alive" seeded engagement (owner's call: no fake stars/copies).
 * The inverse of seed-engagement.ts. For EVERY public prompt it strips bot/persona
 * stars and resets copyCount to the TRUE value from the copyEvents ledger — so only
 * genuine engagement remains (at launch that's ~0, which is the point). Never deletes
 * a prompt. Fully reversible: re-run `npm run seed:engagement` to restore the seeded look.
 *
 * Usage: npx tsx scripts/unseed-engagement.ts        (requires MONGODB_URI in .env.local)
 *        npx tsx scripts/unseed-engagement.ts --dry   (report only, no writes)
 */
import { readFileSync } from "node:fs";
import { MongoClient, type Db } from "mongodb";
import { personaEmailSet, nonPersonaHandledSet, type SeedUser } from "../lib/engagementSeed";

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

// Same junk/persona classifier the seed uses, so we strip exactly what it added.
const JUNK = /(^|[+_-])(uxbot|rltest|sectest|ratetest)|wierzba@/i;
const DRY = process.argv.includes("--dry");

async function main() {
  const client = await new MongoClient(uri as string).connect();
  try {
    const db: Db = client.db(process.env.MONGODB_DB || "promptinghub");

    const users = (
      await db.collection("users").find({}).project({ email: 1, handle: 1, password: 1, passwordHash: 1 }).toArray()
    ).map((u: any): SeedUser => ({ email: u.email, handle: u.handle, hasPassword: !!(u.password || u.passwordHash) }));
    const isJunk = (e: string) => JUNK.test(e);
    const personas = personaEmailSet(users, isJunk); // bot accounts that did the fake starring
    const nonPersonaHandled = nonPersonaHandledSet(users, isJunk); // real/test names that must never appear as starrers

    // True copy counts from the ledger — scrubbed prompts fall back to this, never a guess.
    const realCopies = new Map<string, number>();
    for (const r of await db
      .collection("copyEvents")
      .aggregate([{ $group: { _id: "$promptId", n: { $sum: 1 } } }])
      .toArray()) {
      realCopies.set(String(r._id), r.n as number);
    }

    const prompts = await db
      .collection("prompts")
      .find({})
      .project({ _id: 1, starredBy: 1, copyCount: 1 })
      .toArray();

    let promptsChanged = 0;
    let fakeStarsRemoved = 0;
    let copyInflationRemoved = 0;
    const ops: any[] = [];
    for (const p of prompts) {
      const id = p._id.toString();
      const existing: string[] = Array.isArray(p.starredBy) ? p.starredBy : [];
      const genuine = existing.filter((e) => !personas.has(e) && !nonPersonaHandled.has(e));
      const realCp = realCopies.get(id) || 0;
      const curCp = p.copyCount || 0;
      const starsDiff = existing.length - genuine.length;
      const copyDiff = Math.max(0, curCp - realCp);
      if (starsDiff > 0 || curCp !== realCp) {
        promptsChanged++;
        fakeStarsRemoved += starsDiff;
        copyInflationRemoved += copyDiff;
        ops.push({
          updateOne: { filter: { _id: p._id }, update: { $set: { starredBy: genuine, copyCount: realCp } } },
        });
      }
    }

    console.log(
      `${DRY ? "[DRY] would scrub" : "scrubbing"} ${promptsChanged} prompt(s): ` +
        `−${fakeStarsRemoved} fake star(s), −${copyInflationRemoved} inflated copy count(s). ` +
        `(personas=${personas.size}, total prompts=${prompts.length})`,
    );
    if (!DRY && ops.length) {
      await db.collection("prompts").bulkWrite(ops, { ordered: false });
      console.log("✓ done — only genuine engagement remains. Reversible via npm run seed:engagement.");
    }
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("✗ unseed:engagement failed:", e);
  process.exit(1);
});
