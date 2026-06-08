import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, getRelatedByTags } from "../lib/prompts";

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
  await db.collection("prompts").deleteMany({});
});

describe("getRelatedByTags", () => {
  it("ranks by tag overlap, excludes self, public only", async () => {
    const base = await createPrompt(db, "a@x.com", { name: "Base", description: "d", category: "Writing", body: "x", tags: ["seo", "email", "b2b"] });
    const two = await createPrompt(db, "a@x.com", { name: "TwoOverlap", description: "d", category: "Coding", body: "x", tags: ["seo", "email"] });
    const one = await createPrompt(db, "a@x.com", { name: "OneOverlap", description: "d", category: "Writing", body: "x", tags: ["seo"] });
    await createPrompt(db, "a@x.com", { name: "NoOverlap", description: "d", category: "Writing", body: "x", tags: ["cooking"] });
    await createPrompt(db, "a@x.com", { name: "PrivOverlap", description: "d", category: "Writing", body: "x", tags: ["seo", "email"], isPrivate: true });

    const related = await getRelatedByTags(db, base.id);
    expect(related.map((r) => r.name)).toEqual(["TwoOverlap", "OneOverlap"]);
    expect(related.map((r) => r.id)).not.toContain(base.id);
    expect(two.id).toBeTruthy();
    expect(one.id).toBeTruthy();
  });

  it("returns [] when the prompt has no tags or no matches", async () => {
    const p = await createPrompt(db, "a@x.com", { name: "NoTags", description: "d", category: "Writing", body: "x" });
    expect(await getRelatedByTags(db, p.id)).toEqual([]);
    expect(await getRelatedByTags(db, "nope")).toEqual([]);
  });
});
