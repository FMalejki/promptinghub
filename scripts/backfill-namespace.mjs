import { MongoClient } from "mongodb";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter(Boolean).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    })
);

function slugify(input) {
  const s = input.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
  return s || "prompt";
}

const client = await new MongoClient(env.MONGODB_URI).connect();
const db = client.db(env.MONGODB_DB || "promptinghub");
const users = db.collection("users");
const prompts = db.collection("prompts");

// 1) handles for users (stable, unique)
let handled = 0;
for (const u of await users.find({ handle: { $exists: false } }).toArray()) {
  const base = slugify((u.email || "user").split("@")[0]);
  let handle = base;
  for (let n = 2; await users.findOne({ handle }); n++) handle = `${base}-${n}`;
  await users.updateOne({ _id: u._id }, { $set: { handle } });
  handled++;
}

// 2) slugs for prompts (unique per owner). Some prompts have no user row → derive a handle from email.
let slugged = 0;
for (const p of await prompts.find({ slug: { $exists: false } }).sort({ createdAt: 1, _id: 1 }).toArray()) {
  const base = slugify(p.name || "prompt");
  let slug = base;
  for (let n = 2; await prompts.findOne({ ownerEmail: p.ownerEmail, slug }); n++) slug = `${base}-${n}`;
  await prompts.updateOne({ _id: p._id }, { $set: { slug } });
  // ensure the owner has a handle even if there is no full user doc
  if (p.ownerEmail && !(await users.findOne({ email: p.ownerEmail, handle: { $exists: true } }))) {
    const hbase = slugify(p.ownerEmail.split("@")[0]);
    let handle = hbase;
    for (let n = 2; await users.findOne({ handle }); n++) handle = `${hbase}-${n}`;
    await users.updateOne({ email: p.ownerEmail }, { $set: { handle } }, { upsert: true });
  }
  slugged++;
}

console.log(`handles set: ${handled}, slugs set: ${slugged}`);

// sample a namespaced url
const sample = await prompts.findOne({ slug: { $exists: true } });
if (sample) {
  const owner = await users.findOne({ email: sample.ownerEmail });
  console.log("sample url:", `/p/${owner?.handle}/${sample.slug}`, "→", sample.name);
}
await client.close();
