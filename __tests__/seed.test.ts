import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { seedDatabase, SEED_SOURCE, SEED_COLLECTIONS } from "../lib/seed";
import { AWESOME_PROMPTS } from "../scripts/seed-data/awesome-prompts";
import { PRO_PROMPTS } from "../scripts/seed-data/pro-prompts";
import { COMMUNITY_PROMPTS } from "../scripts/seed-data/community-prompts";
import { listPublicCollections } from "../lib/collections";
import { PROMPT_CATEGORIES, AI_MODELS } from "../lib/constants";

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongod.getUri());
  db = client.db("test");
});
afterAll(async () => {
  await client.close();
  await mongod.stop();
});
beforeEach(async () => {
  await Promise.all([
    db.collection("prompts").deleteMany({}),
    db.collection("collections").deleteMany({}),
    db.collection("users").deleteMany({}),
  ]);
});

const owner = { ownerEmail: "curated@promptinghub.app", ownerName: "Curated" };

describe("dataset integrity", () => {
  it("every prompt uses a valid category and has a body + tags", () => {
    const valid = new Set<string>(PROMPT_CATEGORIES as readonly string[]);
    for (const p of AWESOME_PROMPTS) {
      expect(valid.has(p.category)).toBe(true);
      const hasContent = (p.body?.trim().length ?? 0) > 20 || (p.files?.some((f) => f.content.trim().length > 0) ?? false);
      expect(hasContent).toBe(true);
      expect(p.tags.length).toBeGreaterThan(0);
    }
  });

  it("every collection references prompt names that exist in the dataset", () => {
    const names = new Set(AWESOME_PROMPTS.map((p) => p.name));
    for (const c of SEED_COLLECTIONS) {
      for (const n of c.prompts) expect(names.has(n)).toBe(true);
    }
  });
});

describe("PRO_PROMPTS dataset integrity", () => {
  const validCategories = new Set<string>(PROMPT_CATEGORIES as readonly string[]);
  const validModelIds = new Set<string>(AI_MODELS.map((m) => m.id));

  it("every pro prompt has a valid category, tags, content, and a named author", () => {
    expect(PRO_PROMPTS.length).toBeGreaterThanOrEqual(12);
    for (const p of PRO_PROMPTS) {
      expect(validCategories.has(p.category)).toBe(true);
      expect(p.tags.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.description.trim().length).toBeGreaterThan(20);
      const hasContent =
        (p.body?.trim().length ?? 0) > 40 || (p.files?.some((f) => f.content.trim().length > 40) ?? false);
      expect(hasContent).toBe(true);
      // realistic per-prompt author so the platform reads like real users
      expect(p.authorEmail && p.authorEmail.includes("@")).toBeTruthy();
      expect((p.authorName ?? "").length).toBeGreaterThan(0);
    }
  });

  it("multi-file prompts have non-empty file paths + content", () => {
    for (const p of PRO_PROMPTS) {
      if (!p.files) continue;
      for (const f of p.files) {
        expect(f.path.trim().length).toBeGreaterThan(0);
        expect(f.content.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("testedModels only reference known model ids", () => {
    for (const p of PRO_PROMPTS) {
      for (const id of p.testedModels ?? []) expect(validModelIds.has(id)).toBe(true);
    }
  });

  it("author emails are unique-per-person (a handful of believable creators)", () => {
    const authors = new Set(PRO_PROMPTS.map((p) => p.authorEmail));
    expect(authors.size).toBeGreaterThanOrEqual(5);
  });
});

describe("COMMUNITY_PROMPTS dataset integrity", () => {
  const validCategories = new Set<string>(PROMPT_CATEGORIES as readonly string[]);
  const validModelIds = new Set<string>(AI_MODELS.map((m) => m.id));

  it("every community prompt is valid, attributed, and authored", () => {
    expect(COMMUNITY_PROMPTS.length).toBeGreaterThanOrEqual(6);
    for (const p of COMMUNITY_PROMPTS) {
      expect(validCategories.has(p.category)).toBe(true);
      expect(p.tags.length).toBeGreaterThan(0);
      const hasContent =
        (p.body?.trim().length ?? 0) > 40 || (p.files?.some((f) => f.content.trim().length > 40) ?? false);
      expect(hasContent).toBe(true);
      // honest attribution: every community prompt cites an inspired-by source + URL
      expect((p.source ?? "").length).toBeGreaterThan(0);
      expect((p.sourceUrl ?? "").startsWith("http")).toBe(true);
      expect(p.authorEmail && p.authorEmail.includes("@")).toBeTruthy();
      for (const id of p.testedModels ?? []) expect(validModelIds.has(id)).toBe(true);
    }
  });
});

describe("seedDatabase attribution", () => {
  it("pro set with defaultSource:null is NOT attributed to the CC0 batch", async () => {
    await seedDatabase(db, PRO_PROMPTS, { ...owner, defaultSource: null });
    const doc = await db.collection("prompts").findOne({ name: PRO_PROMPTS[0].name });
    expect(doc?.seeded).toBe(true);
    expect(doc?.source).not.toBe(SEED_SOURCE.name); // no false CC0 attribution
    expect(doc?.source ?? null).toBeNull();
    // authored under its own creator account
    expect(doc?.ownerEmail).toBe(PRO_PROMPTS[0].authorEmail);
  });
});

describe("seedDatabase", () => {
  it("creates prompts with tags + attribution and an owner user", async () => {
    const res = await seedDatabase(db, AWESOME_PROMPTS, owner);
    expect(res.promptsCreated).toBe(AWESOME_PROMPTS.length);

    const user = await db.collection("users").findOne({ email: owner.ownerEmail });
    expect(user?.name).toBe("Curated");

    const one = await db.collection("prompts").findOne({ ownerEmail: owner.ownerEmail, name: "Linux Terminal" });
    expect(one?.source).toBe(SEED_SOURCE.name);
    expect(one?.sourceUrl).toBe(SEED_SOURCE.url);
    expect(one?.seeded).toBe(true);
    expect((one?.tags as string[]).length).toBeGreaterThan(0);
  });

  it("creates the public collections with their prompts", async () => {
    await seedDatabase(db, AWESOME_PROMPTS, owner);
    const cols = await listPublicCollections(db);
    expect(cols.length).toBe(SEED_COLLECTIONS.length);
    const dev = cols.find((c) => c.name === "Developer toolkit");
    expect(dev?.promptCount).toBe(5);
  });

  it("supports multi-file prompts, testedModels, and per-prompt authors", async () => {
    await seedDatabase(
      db,
      [
        {
          name: "Multi agent",
          description: "A big multi-file agent prompt",
          category: "Coding",
          tags: ["agent"],
          files: [
            { path: "system.md", content: "You are an agent." },
            { path: "examples.md", content: "Example: do the thing." },
          ],
          testedModels: ["gemini-2.0-flash", "gpt-4o"],
          authorEmail: "indie@x.com",
          authorName: "Indie Dev",
        },
      ],
      owner,
    );
    const doc = await db.collection("prompts").findOne({ name: "Multi agent" });
    expect(doc?.ownerEmail).toBe("indie@x.com");
    expect(doc?.files).toHaveLength(2);
    expect(doc?.testedModels).toEqual([{ modelId: "gemini-2.0-flash" }, { modelId: "gpt-4o" }]);
    // the per-prompt author got a real user doc
    const author = await db.collection("users").findOne({ email: "indie@x.com" });
    expect(author?.name).toBe("Indie Dev");
  });

  it("is idempotent — re-running skips everything, no duplicates", async () => {
    await seedDatabase(db, AWESOME_PROMPTS, owner);
    const res2 = await seedDatabase(db, AWESOME_PROMPTS, owner);
    expect(res2.promptsCreated).toBe(0);
    expect(res2.promptsSkipped).toBe(AWESOME_PROMPTS.length);
    expect(res2.collectionsCreated).toBe(0);

    const count = await db.collection("prompts").countDocuments({ ownerEmail: owner.ownerEmail });
    expect(count).toBe(AWESOME_PROMPTS.length);
    const colCount = await db.collection("collections").countDocuments({ ownerEmail: owner.ownerEmail });
    expect(colCount).toBe(SEED_COLLECTIONS.length);
  });
});
