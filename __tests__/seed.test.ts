import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { seedDatabase, SEED_SOURCE, SEED_COLLECTIONS } from "../lib/seed";
import { AWESOME_PROMPTS } from "../scripts/seed-data/awesome-prompts";
import { listPublicCollections } from "../lib/collections";
import { PROMPT_CATEGORIES } from "../lib/constants";

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
