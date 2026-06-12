/**
 * Reassign the owner's skill prompts from one account to another by changing
 * `ownerEmail`. Authorship everywhere (cards, profile, dashboard) is resolved by
 * joining `users` on ownerEmail, so this is the only field that needs to move —
 * prompt _ids are stable, so collections referencing these prompts stay intact.
 *
 * Reversible: swap FROM/TO (or pass --from / --to) and run again.
 * Idempotent: only moves prompts currently owned by FROM.
 *
 * Usage:
 *   npx tsx scripts/reassign-skills.ts --dry
 *   npx tsx scripts/reassign-skills.ts
 *   npx tsx scripts/reassign-skills.ts --from a@b.com --to c@d.com
 */
import { MongoClient, type Db } from "mongodb";
import { readFileSync } from "node:fs";

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

const DRY = process.argv.includes("--dry");
const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
// Default: move the owner's skills from the gmail account onto the account the
// owner actually browses as (adrkrw), so they show up in that dashboard.
const FROM = arg("--from") || "kptgowniak@gmail.com";
const TO = arg("--to") || "adrkrawczyk@student.agh.edu.pl";

async function main() {
  const client = await new MongoClient(uri as string).connect();
  try {
    const db: Db = client.db(process.env.MONGODB_DB || "promptinghub");

    const toUser = await db.collection("users").findOne({ email: TO });
    if (!toUser) {
      console.error(`✗ target account ${TO} has no users doc — aborting (won't orphan prompts).`);
      process.exit(1);
    }

    const docs = await db
      .collection("prompts")
      .find({ ownerEmail: FROM })
      .project({ name: 1 })
      .toArray();

    if (docs.length === 0) {
      console.log(`= nothing to move: no prompts owned by ${FROM}.`);
      return;
    }

    console.log(`${DRY ? "[DRY] would move" : "Moving"} ${docs.length} prompt(s): ${FROM} → ${TO}`);
    for (const d of docs) console.log(`  - ${d.name}`);

    if (!DRY) {
      const res = await db
        .collection("prompts")
        .updateMany({ ownerEmail: FROM }, { $set: { ownerEmail: TO } });
      console.log(`✓ reassigned ${res.modifiedCount} prompt(s) to ${TO} (${toUser.name}/@${toUser.handle}).`);
    }
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("✗ reassign-skills failed:", e);
  process.exit(1);
});
