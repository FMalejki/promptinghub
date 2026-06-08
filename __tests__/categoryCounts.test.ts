import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { categoryCounts, totalFromCounts } from "../lib/categoryCounts";

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

describe("categoryCounts", () => {
  it("counts public prompts per category and excludes private ones", async () => {
    await db.collection("prompts").insertMany([
      { category: "Coding", isPrivate: false },
      { category: "Coding", isPrivate: false },
      { category: "Writing", isPrivate: false },
      { category: "Coding", isPrivate: true }, // private → excluded
    ]);
    const counts = await categoryCounts(db);
    expect(counts).toEqual({ Coding: 2, Writing: 1 });
    expect(counts.Debugging).toBeUndefined();
  });

  it("totalFromCounts sums the values", () => {
    expect(totalFromCounts({ Coding: 2, Writing: 1 })).toBe(3);
    expect(totalFromCounts({})).toBe(0);
  });
});
