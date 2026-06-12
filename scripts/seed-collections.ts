/**
 * Seed a few PUBLIC, editorial collections that group EXISTING real prompts by
 * theme — so /collections stops reading empty at launch. This is curation, not
 * fake engagement: no stars/copies are touched, prompts are grouped by name from
 * whatever is already in the catalogue (any author). Owned by the curated editorial
 * account. Idempotent (skips a collection that already exists) and reversible
 * (collections are additive docs you can delete).
 *
 * Usage: npx tsx scripts/seed-collections.ts        (requires MONGODB_URI in .env.local)
 *        npx tsx scripts/seed-collections.ts --dry   (report only)
 */
import { readFileSync } from "node:fs";
import { MongoClient, type Db } from "mongodb";
import { createCollection, addPromptToCollection } from "../lib/collections";

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

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || "curated@promptinghub.app";
const OWNER_NAME = "PromptingHub Curated";
const DRY = process.argv.includes("--dry");

// Collections group prompts by EXACT name. Names must match prompts already in the
// catalogue; a name with no match is logged and skipped (never fabricated).
const COLLECTIONS: { name: string; description: string; prompts: string[] }[] = [
  {
    name: "Agentic Workflows",
    description: "Build agents that reason, act, and self-correct — loops, planning, and multi-agent setups.",
    prompts: [
      "ReAct Agent Loop (reason + act + observe)",
      "Self-Consistency Reasoner",
      "Tree-of-Thoughts Planner",
      "Multi-Agent Debate Panel",
      "Map-Reduce Research Agent",
      "Anti-interruption Autonomous Loop",
      "Chain-of-Thought Decomposer",
    ],
  },
  {
    name: "Ship Better Code",
    description: "Reviews, tests, commits, and incident response that hold up in production.",
    prompts: [
      "Staff-Level Code Reviewer",
      "Pull Request Reviewer",
      "Conventional Commit Writer",
      "Edge-Case Test Generator",
      "Kubernetes Manifest Hardener",
      "Advanced Log Analyzer & Debugger",
      "Blameless Incident Postmortem Author",
    ],
  },
  {
    name: "Agent Discipline",
    description: "Working-with-agents habits: work logs, verification, deploy discipline, and lean tooling.",
    prompts: [
      "Resume-After-Reset Working Log",
      "Verify Before You Claim Done",
      "Ship & Verify Live (deploy discipline)",
      "Interrogate My Plan (evidence-required)",
      "Audit & Prune Unused Agent Tooling",
      "Auto-Extract Lessons from Each Session",
      "Guardrails: Block Destructive Commands Unattended",
      "Size the Compaction Window to the Model",
    ],
  },
  {
    name: "Data, SQL & RAG",
    description: "Query tuning, data wrangling, and retrieval pipelines.",
    prompts: [
      "SQL Query Optimizer",
      "Postgres Query Optimizer — EXPLAIN ANALYZE",
      "Pandas Data-Wrangling Pair",
      "RAG Pipeline Architect",
      "RAG Pipeline Blueprint",
      "Few-Shot Classifier Builder",
    ],
  },
  {
    name: "Cold Outbound Email",
    description: "Write cold emails people actually reply to.",
    prompts: ["Cold Email Rewriter", "B2B Cold Outbound Email Writer", "Universal Cold Email Generator"],
  },
];

async function main() {
  const client = await new MongoClient(uri as string).connect();
  try {
    const db: Db = client.db(process.env.MONGODB_DB || "promptinghub");

    // Ensure the curator user exists so /collections can resolve the owner name.
    if (!DRY) {
      await db.collection("users").updateOne(
        { email: OWNER_EMAIL },
        { $setOnInsert: { email: OWNER_EMAIL, name: OWNER_NAME, image: null, createdAt: new Date() } },
        { upsert: true },
      );
    }

    // Resolve every referenced name to a public prompt id once.
    const allNames = [...new Set(COLLECTIONS.flatMap((c) => c.prompts))];
    const docs = await db
      .collection("prompts")
      .find({ name: { $in: allNames }, isPrivate: { $ne: true } })
      .project({ _id: 1, name: 1 })
      .toArray();
    const idByName = new Map<string, string>();
    for (const d of docs) idByName.set(d.name as string, d._id.toString());

    let created = 0;
    let skipped = 0;
    for (const c of COLLECTIONS) {
      const ids = c.prompts.map((n) => idByName.get(n)).filter((x): x is string => !!x);
      const missing = c.prompts.filter((n) => !idByName.get(n));
      if (missing.length) console.log(`  ⚠ "${c.name}": ${missing.length} name(s) not found → ${missing.join(", ")}`);
      if (ids.length === 0) {
        console.log(`  – "${c.name}": no matching prompts, skipping`);
        continue;
      }

      const existing = await db.collection("collections").findOne({ ownerEmail: OWNER_EMAIL, name: c.name });
      if (existing) {
        console.log(`  = "${c.name}" exists (${ids.length} prompts available)`);
        skipped++;
        continue;
      }
      console.log(`  ${DRY ? "[DRY] would create" : "+ creating"} "${c.name}" with ${ids.length} prompt(s)`);
      if (!DRY) {
        const { id } = await createCollection(db, OWNER_EMAIL, { name: c.name, description: c.description });
        for (const pid of ids) await addPromptToCollection(db, id, OWNER_EMAIL, pid);
        created++;
      }
    }
    console.log(`✓ collections: ${created} created, ${skipped} skipped (owner ${OWNER_EMAIL}).`);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("✗ seed:collections failed:", e);
  process.exit(1);
});
