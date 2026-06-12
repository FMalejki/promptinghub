import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { listPrompts } from "../lib/prompts";

// "Popular" must rank by combined engagement (stars + copies + views), not stars
// alone — otherwise, with fake engagement zeroed, it collapses into "recent".
// Weighting: stars ×3, copies ×2, views ×1.

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

async function seed(
  name: string,
  { stars = 0, copies = 0, views = 0, createdAt }: { stars?: number; copies?: number; views?: number; createdAt: Date },
) {
  await db.collection("prompts").insertOne({
    name,
    description: "d",
    category: "Misc",
    isPrivate: false,
    createdAt,
    starredBy: Array.from({ length: stars }, (_, i) => `u${i}@x.com`),
    copyCount: copies,
    viewCount: views,
    ownerEmail: "a@x.com",
  });
}

describe("listPrompts sort=popular (engagement)", () => {
  it("orders by weighted total engagement, not stars alone", async () => {
    // engagementScore: lotsViews = 50; oneStar = 3; someCopies = 8 → copies > star > none,
    // but views-heavy still beats a single star here.
    await seed("oneStar", { stars: 1, createdAt: new Date("2026-01-01") }); // 3
    await seed("someCopies", { copies: 4, createdAt: new Date("2026-01-02") }); // 8
    await seed("lotsViews", { views: 50, createdAt: new Date("2026-01-03") }); // 50
    await seed("nothing", { createdAt: new Date("2026-01-04") }); // 0
    const names = (await listPrompts(db, { sort: "popular" })).map((p) => p.name);
    expect(names).toEqual(["lotsViews", "someCopies", "oneStar", "nothing"]);
  });

  it("weights a star (×3) above a single copy (×2) above a single view (×1)", async () => {
    await seed("star", { stars: 1, createdAt: new Date("2026-01-01") }); // 3
    await seed("copy", { copies: 1, createdAt: new Date("2026-01-02") }); // 2
    await seed("view", { views: 1, createdAt: new Date("2026-01-03") }); // 1
    const names = (await listPrompts(db, { sort: "popular" })).map((p) => p.name);
    expect(names).toEqual(["star", "copy", "view"]);
  });

  it("breaks engagement ties by most recent", async () => {
    await seed("older", { stars: 2, createdAt: new Date("2026-01-01") }); // 6
    await seed("newer", { stars: 2, createdAt: new Date("2026-02-01") }); // 6
    const names = (await listPrompts(db, { sort: "popular" })).map((p) => p.name);
    expect(names).toEqual(["newer", "older"]);
  });
});
