import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, toggleStar } from "../lib/prompts";
import { ownerAnalytics } from "../lib/analytics";

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

describe("ownerAnalytics", () => {
  it("totals copies/stars/forks and lists per-prompt rows by copies desc", async () => {
    const p1 = await createPrompt(db, "me@x.com", { name: "Popular", description: "d", category: "Writing", body: "x" });
    const p2 = await createPrompt(db, "me@x.com", { name: "Quiet", description: "d", category: "Writing", body: "x" });

    // p1: 5 copies, 1 star, 1 fork; p2: 0 copies
    await db.collection("prompts").updateOne({ name: "Popular" }, { $set: { copyCount: 5 } });
    await toggleStar(db, p1.id, "fan@x.com");
    await createPrompt(db, "other@x.com", { name: "Fork of popular", description: "d", category: "Writing", body: "x", forkedFrom: p1.id });

    const a = await ownerAnalytics(db, "me@x.com");
    expect(a.totals).toEqual({ prompts: 2, copies: 5, stars: 1, forks: 1 });
    expect(a.perPrompt.map((r) => r.name)).toEqual(["Popular", "Quiet"]);
    expect(a.perPrompt[0]).toMatchObject({ id: p1.id, copyCount: 5, stars: 1, forkCount: 1 });
    expect(a.perPrompt[1]).toMatchObject({ id: p2.id, copyCount: 0, stars: 0, forkCount: 0 });
  });

  it("returns zeros for an owner with no prompts", async () => {
    const a = await ownerAnalytics(db, "nobody@x.com");
    expect(a.totals).toEqual({ prompts: 0, copies: 0, stars: 0, forks: 0 });
    expect(a.perPrompt).toEqual([]);
  });
});
