// One-off: compute + store semantic embeddings for every prompt that lacks one,
// so existing prompts are findable "by meaning" without waiting for an edit.
// Uses the SAME local MiniLM model as the app (free, keyless). Idempotent — pass
// --all to recompute every prompt (e.g. after changing the model/text recipe).
//
// Run: node scripts/backfill-embeddings.mjs        (only missing)
//      node scripts/backfill-embeddings.mjs --all   (recompute all)

import { MongoClient } from "mongodb";
import fs from "node:fs";
import { pipeline, env as xenv } from "@xenova/transformers";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter(Boolean).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);

const ALL = process.argv.includes("--all");

xenv.allowLocalModels = false;
const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { quantized: true });
const embed = async (text) => {
  const clean = (text || "").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (!clean) return null;
  const out = await extractor(clean, { pooling: "mean", normalize: true });
  return Array.from(out.data);
};
const textFor = (p) => [p.name || "", p.description || "", ...(p.tags || [])].filter(Boolean).join(". ").trim();

const client = await new MongoClient(env.MONGODB_URI).connect();
const db = client.db(env.MONGODB_DB || "promptinghub");

const query = ALL ? {} : { embedding: { $exists: false } };
const prompts = await db.collection("prompts").find(query, { projection: { name: 1, description: 1, tags: 1 } }).toArray();
console.log(`Embedding ${prompts.length} prompt(s)${ALL ? " (--all)" : " (missing only)"}…`);

let done = 0;
let skipped = 0;
for (const p of prompts) {
  const vec = await embed(textFor(p));
  if (!vec) { skipped++; continue; }
  await db.collection("prompts").updateOne({ _id: p._id }, { $set: { embedding: vec } });
  done++;
  if (done % 20 === 0) console.log(`  …${done}/${prompts.length}`);
}

console.log(`Done. Embedded ${done}, skipped ${skipped} (empty text).`);
await client.close();
