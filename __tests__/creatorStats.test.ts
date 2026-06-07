import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { creatorStats } from "../lib/users";

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
  await db.collection("users").deleteMany({});
  await db.collection("prompts").deleteMany({});
});

describe("creatorStats", () => {
  it("returns joinedAt and the sum of public prompt views/copies", async () => {
    const joined = new Date("2026-01-15T00:00:00Z");
    await db.collection("users").insertOne({ email: "a@x.com", handle: "a", createdAt: joined });
    await db.collection("prompts").insertMany([
      { ownerEmail: "a@x.com", isPrivate: false, viewCount: 10, copyCount: 3 },
      { ownerEmail: "a@x.com", isPrivate: false, viewCount: 5, copyCount: 1 },
    ]);
    const s = await creatorStats(db, "a@x.com");
    expect(s.joinedAt).toEqual(joined);
    expect(s.totalViews).toBe(15);
    expect(s.totalCopies).toBe(4);
  });

  it("excludes private prompts from the totals", async () => {
    await db.collection("users").insertOne({ email: "a@x.com", handle: "a", createdAt: new Date() });
    await db.collection("prompts").insertMany([
      { ownerEmail: "a@x.com", isPrivate: false, viewCount: 7, copyCount: 2 },
      { ownerEmail: "a@x.com", isPrivate: true, viewCount: 100, copyCount: 50 },
    ]);
    const s = await creatorStats(db, "a@x.com");
    expect(s.totalViews).toBe(7);
    expect(s.totalCopies).toBe(2);
  });

  it("treats missing counts as zero and handles no prompts", async () => {
    await db.collection("users").insertOne({ email: "a@x.com", handle: "a", createdAt: new Date() });
    await db.collection("prompts").insertOne({ ownerEmail: "a@x.com", isPrivate: false }); // no counts
    const s = await creatorStats(db, "a@x.com");
    expect(s.totalViews).toBe(0);
    expect(s.totalCopies).toBe(0);
  });

  it("returns null joinedAt and zero totals for an unknown creator", async () => {
    const s = await creatorStats(db, "ghost@x.com");
    expect(s).toEqual({ joinedAt: null, totalViews: 0, totalCopies: 0 });
  });
});
