import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, topCategories } from "../lib/prompts";

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

describe("topCategories", () => {
  it("counts public prompts per category, most first", async () => {
    await createPrompt(db, "a@x.com", { name: "1", description: "d", category: "Writing", body: "x" });
    await createPrompt(db, "a@x.com", { name: "2", description: "d", category: "Writing", body: "x" });
    await createPrompt(db, "a@x.com", { name: "3", description: "d", category: "Coding", body: "x" });
    await createPrompt(db, "a@x.com", { name: "p", description: "d", category: "Coding", body: "x", isPrivate: true });

    expect(await topCategories(db)).toEqual([
      { category: "Writing", count: 2 },
      { category: "Coding", count: 1 },
    ]);
  });

  it("returns an empty list with no public prompts", async () => {
    expect(await topCategories(db)).toEqual([]);
  });
});
