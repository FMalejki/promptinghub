import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { rateLimit, clientIp } from "../lib/rateLimit";

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
  await db.collection("rateLimits").deleteMany({});
});

describe("rateLimit", () => {
  it("allows up to the limit then blocks within the same window", async () => {
    const now = 1_000_000;
    const oks: boolean[] = [];
    for (let i = 0; i < 5; i++) oks.push((await rateLimit(db, "ip:reg", 3, 60_000, now)).ok);
    expect(oks).toEqual([true, true, true, false, false]);
  });

  it("reports remaining count", async () => {
    const now = 2_000_000;
    expect((await rateLimit(db, "k", 2, 60_000, now)).remaining).toBe(1);
    expect((await rateLimit(db, "k", 2, 60_000, now)).remaining).toBe(0);
    expect((await rateLimit(db, "k", 2, 60_000, now)).remaining).toBe(0);
  });

  it("resets in a new window", async () => {
    const w = 60_000;
    await rateLimit(db, "k", 1, w, 0);
    expect((await rateLimit(db, "k", 1, w, 0)).ok).toBe(false); // same window
    expect((await rateLimit(db, "k", 1, w, w)).ok).toBe(true); // next window
  });

  it("keeps separate keys independent", async () => {
    const now = 5_000_000;
    expect((await rateLimit(db, "a", 1, 60_000, now)).ok).toBe(true);
    expect((await rateLimit(db, "b", 1, 60_000, now)).ok).toBe(true);
    expect((await rateLimit(db, "a", 1, 60_000, now)).ok).toBe(false);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip then 'unknown'", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
