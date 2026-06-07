import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { listPrompts } from "../lib/prompts";

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

async function seed(name: string, viewCount: number | undefined, createdAt: Date) {
  const doc: Record<string, unknown> = { name, description: "d", category: "Misc", isPrivate: false, createdAt, starredBy: [], ownerEmail: "a@x.com" };
  if (viewCount !== undefined) doc.viewCount = viewCount;
  await db.collection("prompts").insertOne(doc);
}

describe("listPrompts sort=viewed", () => {
  it("orders by viewCount descending", async () => {
    await seed("low", 3, new Date("2026-01-01"));
    await seed("high", 99, new Date("2026-01-02"));
    await seed("mid", 20, new Date("2026-01-03"));
    const names = (await listPrompts(db, { sort: "viewed" })).map((p) => p.name);
    expect(names).toEqual(["high", "mid", "low"]);
  });

  it("treats a missing viewCount as zero", async () => {
    await seed("seen", 5, new Date("2026-01-01"));
    await seed("never", undefined, new Date("2026-01-02"));
    const names = (await listPrompts(db, { sort: "viewed" })).map((p) => p.name);
    expect(names).toEqual(["seen", "never"]);
  });

  it("breaks viewCount ties by most recent", async () => {
    await seed("older", 10, new Date("2026-01-01"));
    await seed("newer", 10, new Date("2026-02-01"));
    const names = (await listPrompts(db, { sort: "viewed" })).map((p) => p.name);
    expect(names).toEqual(["newer", "older"]);
  });
});
