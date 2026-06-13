import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, toggleStar } from "../lib/prompts";
import { ownerAnalytics, activityTimeseries } from "../lib/analytics";

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

describe("activityTimeseries", () => {
  beforeEach(async () => {
    await db.collection("copyEvents").deleteMany({});
    await db.collection("viewEvents").deleteMany({});
  });

  it("returns zero-filled per-day copies and views over the window", async () => {
    const now = new Date("2026-06-13T12:00:00Z");
    const p = await createPrompt(db, "me@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    const id = p.id;
    await db.collection("copyEvents").insertMany([
      { promptId: id, createdAt: new Date("2026-06-13T01:00:00Z") },
      { promptId: id, createdAt: new Date("2026-06-13T09:00:00Z") },
      { promptId: id, createdAt: new Date("2026-06-12T09:00:00Z") },
    ]);
    await db.collection("viewEvents").insertMany([
      { promptId: id, createdAt: new Date("2026-06-13T02:00:00Z") },
    ]);

    const series = await activityTimeseries(db, "me@x.com", 14, now);
    expect(series).toHaveLength(14);
    const last = series[series.length - 1];
    expect(last).toEqual({ day: "2026-06-13", copies: 2, views: 1 });
    expect(series[series.length - 2]).toEqual({ day: "2026-06-12", copies: 1, views: 0 });
    // activity (copies+views) on the last day = 3
    expect(last.copies + last.views).toBe(3);
  });

  it("returns an all-zero window for an owner with no prompts", async () => {
    const series = await activityTimeseries(db, "nobody@x.com", 7, new Date("2026-06-13T12:00:00Z"));
    expect(series).toHaveLength(7);
    expect(series.every((p) => p.copies === 0 && p.views === 0)).toBe(true);
  });
});
