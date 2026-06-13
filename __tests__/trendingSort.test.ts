import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { listPrompts } from "../lib/prompts";

// Browse `sort=trending` must rank by engagement with gravity decay by age, so a
// fresh, engaged prompt outranks a stale one with equal (or even higher) engagement
// — "more popular AND more recent". score = engagement / sqrt(ageHours + 2),
// engagement = stars*3 + copies*2 + views.

const HOUR = 3600 * 1000;

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

describe("listPrompts sort=trending (engagement × recency decay)", () => {
  it("ranks a newer prompt above an older one with equal engagement", async () => {
    await seed("older", { stars: 2, createdAt: new Date(Date.now() - 200 * HOUR) });
    await seed("newer", { stars: 2, createdAt: new Date(Date.now() - 1 * HOUR) });
    const names = (await listPrompts(db, { sort: "trending" })).map((p) => p.name);
    expect(names).toEqual(["newer", "older"]);
  });

  it("lets a fresh, modestly-engaged prompt outrank a stale high-engagement one", async () => {
    // stale: engagement 10 (copies 5), ~1000h old → 10/sqrt(1002) ≈ 0.32
    await seed("stale", { copies: 5, createdAt: new Date(Date.now() - 1000 * HOUR) });
    // fresh: engagement 3 (1 star), ~1h old → 3/sqrt(3) ≈ 1.73
    await seed("fresh", { stars: 1, createdAt: new Date(Date.now() - 1 * HOUR) });
    const names = (await listPrompts(db, { sort: "trending" })).map((p) => p.name);
    expect(names[0]).toBe("fresh");
  });

  it("at equal age, ranks higher engagement first", async () => {
    const when = new Date(Date.now() - 10 * HOUR);
    await seed("low", { copies: 1, createdAt: when });
    await seed("high", { stars: 3, createdAt: when });
    const names = (await listPrompts(db, { sort: "trending" })).map((p) => p.name);
    expect(names).toEqual(["high", "low"]);
  });
});
