import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, topTags } from "../lib/prompts";

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

describe("topTags", () => {
  it("counts tag usage across public prompts, most-used first", async () => {
    await createPrompt(db, "a@x.com", { name: "1", description: "d", category: "Writing", body: "x", tags: ["seo", "email"] });
    await createPrompt(db, "a@x.com", { name: "2", description: "d", category: "Writing", body: "x", tags: ["seo"] });
    await createPrompt(db, "a@x.com", { name: "3", description: "d", category: "Writing", body: "x", tags: ["email", "seo"] });

    const tags = await topTags(db);
    expect(tags).toEqual([
      { tag: "seo", count: 3 },
      { tag: "email", count: 2 },
    ]);
  });

  it("excludes private prompts and respects the limit", async () => {
    await createPrompt(db, "a@x.com", { name: "pub", description: "d", category: "Writing", body: "x", tags: ["public-tag"] });
    await createPrompt(db, "a@x.com", { name: "priv", description: "d", category: "Writing", body: "x", tags: ["secret"], isPrivate: true });

    const tags = await topTags(db, 5);
    expect(tags.map((t) => t.tag)).toEqual(["public-tag"]);
  });

  it("returns an empty list when nothing is tagged", async () => {
    await createPrompt(db, "a@x.com", { name: "no tags", description: "d", category: "Writing", body: "x" });
    expect(await topTags(db)).toEqual([]);
  });

  it("paginates with offset (stable rank order across pages)", async () => {
    // Five tags with strictly descending usage so the rank order is deterministic.
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j <= i; j++) {
        await createPrompt(db, "a@x.com", { name: `p${i}-${j}`, description: "d", category: "Writing", body: "x", tags: [`tag${4 - i}`] });
      }
    }
    // tag0 used 5×, tag1 4×, …, tag4 1×.
    const page1 = await topTags(db, 2, 0);
    const page2 = await topTags(db, 2, 2);
    const page3 = await topTags(db, 2, 4);
    expect(page1.map((t) => t.tag)).toEqual(["tag0", "tag1"]);
    expect(page2.map((t) => t.tag)).toEqual(["tag2", "tag3"]);
    expect(page3.map((t) => t.tag)).toEqual(["tag4"]);
  });
});
