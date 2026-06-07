import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, incrementCopyCount } from "../lib/prompts";
import { copyTimeseries } from "../lib/analytics";

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
  for (const c of ["prompts", "copyEvents"]) await db.collection(c).deleteMany({});
});

function dayStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

describe("copyTimeseries", () => {
  it("buckets owner copy events per day over the window, filling zeros", async () => {
    const now = new Date("2026-06-07T12:00:00Z");
    const today = new Date("2026-06-07T08:00:00Z");
    const twoAgo = new Date("2026-06-05T08:00:00Z");

    const p = await createPrompt(db, "me@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    await db.collection("copyEvents").insertMany([
      { promptId: p.id, createdAt: today },
      { promptId: p.id, createdAt: today },
      { promptId: p.id, createdAt: twoAgo },
    ]);

    const series = await copyTimeseries(db, "me@x.com", 3, now);
    expect(series).toEqual([
      { day: "2026-06-05", count: 1 },
      { day: "2026-06-06", count: 0 },
      { day: "2026-06-07", count: 2 },
    ]);
    expect(dayStr(now)).toBe("2026-06-07");
  });

  it("ignores other owners' events and returns zeros when none", async () => {
    const now = new Date("2026-06-07T12:00:00Z");
    await createPrompt(db, "me@x.com", { name: "Mine", description: "d", category: "Writing", body: "x" });
    const other = await createPrompt(db, "other@x.com", { name: "Theirs", description: "d", category: "Writing", body: "x" });
    await db.collection("copyEvents").insertOne({ promptId: other.id, createdAt: now });

    const series = await copyTimeseries(db, "me@x.com", 2, now);
    expect(series.map((s) => s.count)).toEqual([0, 0]);
  });
});

describe("incrementCopyCount logging", () => {
  it("records a copy event each time", async () => {
    const p = await createPrompt(db, "me@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    await incrementCopyCount(db, p.id);
    await incrementCopyCount(db, p.id);
    expect(await db.collection("copyEvents").countDocuments({ promptId: p.id })).toBe(2);
  });
});
