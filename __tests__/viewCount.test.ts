import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, incrementViewCount, getPromptDetail } from "../lib/prompts";

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

describe("incrementViewCount", () => {
  it("increments from zero and returns the running total", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Misc", body: "x" });
    expect(await incrementViewCount(db, id)).toBe(1);
    expect(await incrementViewCount(db, id)).toBe(2);
    const detail = await getPromptDetail(db, id);
    expect(detail?.viewCount).toBe(2);
  });

  it("returns null for a malformed id", async () => {
    expect(await incrementViewCount(db, "nope")).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    expect(await incrementViewCount(db, "507f1f77bcf86cd799439011")).toBeNull();
  });

  it("defaults viewCount to 0 on prompts that were never viewed", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "Q", description: "d", category: "Misc", body: "x" });
    const detail = await getPromptDetail(db, id);
    expect(detail?.viewCount).toBe(0);
  });
});
