import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, incrementCopyCount, getRelatedPrompts } from "../lib/prompts";

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

describe("getRelatedPrompts", () => {
  it("returns other prompts in the same category, excluding itself", async () => {
    const a = await createPrompt(db, "u@x.com", { name: "A", description: "d", category: "Writing", body: "b" });
    await createPrompt(db, "u@x.com", { name: "B", description: "d", category: "Writing", body: "b" });
    await createPrompt(db, "u@x.com", { name: "C", description: "d", category: "Coding", body: "b" });
    const related = await getRelatedPrompts(db, a.id);
    expect(related.map((p) => p.name).sort()).toEqual(["B"]);
  });

  it("orders by copyCount desc and respects the limit", async () => {
    const a = await createPrompt(db, "u@x.com", { name: "A", description: "d", category: "Writing", body: "b" });
    const b = await createPrompt(db, "u@x.com", { name: "B", description: "d", category: "Writing", body: "b" });
    const c = await createPrompt(db, "u@x.com", { name: "C", description: "d", category: "Writing", body: "b" });
    await incrementCopyCount(db, c.id);
    await incrementCopyCount(db, c.id);
    await incrementCopyCount(db, b.id);
    const related = await getRelatedPrompts(db, a.id, 1);
    expect(related.map((p) => p.name)).toEqual(["C"]);
  });

  it("excludes private prompts", async () => {
    const a = await createPrompt(db, "u@x.com", { name: "A", description: "d", category: "Writing", body: "b" });
    await createPrompt(db, "u@x.com", { name: "Secret", description: "d", category: "Writing", body: "b", isPrivate: true });
    const related = await getRelatedPrompts(db, a.id);
    expect(related.map((p) => p.name)).toEqual([]);
  });

  it("returns [] for a malformed or missing id", async () => {
    expect(await getRelatedPrompts(db, "nope")).toEqual([]);
    expect(await getRelatedPrompts(db, "0123456789abcdef01234567")).toEqual([]);
  });
});
