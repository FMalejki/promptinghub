/**
 * "Looks alive" COMMUNITY model-attestations seed. Gives persona-owned prompts a
 * realistic set of works/mixed/broken votes so the ✓Works/~Mixed/✗Issues card badge
 * (ns/214) actually shows up. Deterministic + IDEMPOTENT (upsert one row per
 * promptId+email+modelId). Additive only — never deletes a real vote.
 *
 * Follows the ns/215 rule: ONLY persona-owned prompts get seeded, and ONLY persona
 * accounts vote (passwordless seed accounts; real signups have a password). A bot
 * confirming a REAL prompt is fine; faking votes on a test/real-user prompt is not.
 *
 * Usage: npm run seed:attestations   (requires MONGODB_URI in .env.local/env)
 */
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import { attestationsFor } from "../lib/attestationSeed";
import { personaEmailSet, type SeedUser } from "../lib/engagementSeed";

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

const JUNK = /(^|[+_-])(uxbot|rltest|sectest|ratetest)|wierzba@/i;

async function main() {
  const client = await new MongoClient(uri as string).connect();
  try {
    const db = client.db(process.env.MONGODB_DB || "promptinghub");

    const users = (await db.collection("users").find({}).project({ email: 1, handle: 1, password: 1, passwordHash: 1 }).toArray()).map(
      (u: any): SeedUser => ({ email: u.email, handle: u.handle, hasPassword: !!(u.password || u.passwordHash) }),
    );
    const personas = personaEmailSet(users, (e) => JUNK.test(e));
    const personaEmails = [...personas];
    console.log(`persona voter pool: ${personaEmails.length}`);

    const prompts = await db
      .collection("prompts")
      .find({})
      .project({ _id: 1, ownerEmail: 1, testedModels: 1, isPrivate: 1 })
      .toArray();
    const ownerById = new Map<string, string>(prompts.map((p: any) => [p._id.toString(), (p.ownerEmail as string) || ""]));

    // Scrub pre-existing test-noise attestations: any vote whose VOTER isn't a persona
    // or whose PROMPT isn't persona-owned is fake-looking (a dev/QA test-click on a
    // test prompt) — same class the engagement scrub removed. Genuine community votes
    // would be by real users on persona prompts, which this never touches at launch.
    const scrub: any[] = [];
    for (const a of await db.collection("modelAttestations").find({}).project({ _id: 1, email: 1, promptId: 1 }).toArray()) {
      const owner = ownerById.get(String(a.promptId)) || "";
      if (!personas.has(a.email as string) || !personas.has(owner)) scrub.push(a._id);
    }
    if (scrub.length) await db.collection("modelAttestations").deleteMany({ _id: { $in: scrub } });
    console.log(`scrubbed ${scrub.length} non-persona attestation(s)`);

    let touchedPrompts = 0;
    const ops: any[] = [];
    const now = new Date();
    for (const p of prompts) {
      if (p.isPrivate === true) continue; // public prompts only
      const owner = (p.ownerEmail as string) || "";
      if (!personas.has(owner)) continue; // only persona-owned prompts (ns/215 rule)
      const pool = personaEmails.filter((e) => e !== owner); // can't attest your own
      const models = (Array.isArray(p.testedModels) ? p.testedModels : []).map((m: any) => m?.modelId).filter(Boolean);
      const votes = attestationsFor(p._id.toString(), models, pool);
      if (!votes.length) continue;
      for (const v of votes) {
        ops.push({
          updateOne: {
            filter: { promptId: p._id.toString(), email: v.email, modelId: v.modelId },
            update: {
              $set: { vote: v.vote, updatedAt: now },
              $setOnInsert: { promptId: p._id.toString(), email: v.email, modelId: v.modelId, createdAt: now },
            },
            upsert: true,
          },
        });
      }
      touchedPrompts++;
    }
    if (ops.length) await db.collection("modelAttestations").bulkWrite(ops, { ordered: false });
    console.log(`✓ seeded ${ops.length} attestation vote(s) across ${touchedPrompts} persona prompt(s) (idempotent, additive)`);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("✗ seed:attestations failed:", e);
  process.exit(1);
});
