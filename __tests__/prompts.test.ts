import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { listPrompts, getPrompt } from "../lib/prompts";

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
  await db.collection("prompts").insertMany([
    { name: "Summarize", description: "Summarize any text concisely", body: "..." },
    { name: "Translate PL", description: "Translate to Polish", body: "..." },
    { name: "Code review", description: "Review code for bugs", body: "..." },
  ]);
});

describe("listPrompts", () => {
  it("returns all prompts when no query", async () => {
    const rows = await listPrompts(db);
    expect(rows).toHaveLength(3);
  });

  it("filters by name (case-insensitive)", async () => {
    const rows = await listPrompts(db, "code");
    expect(rows.map((r) => r.name)).toEqual(["Code review"]);
  });

  it("filters by description", async () => {
    const rows = await listPrompts(db, "polish");
    expect(rows.map((r) => r.name)).toEqual(["Translate PL"]);
  });

  it("returns id as string", async () => {
    const rows = await listPrompts(db);
    expect(typeof rows[0].id).toBe("string");
  });
});

describe("getPrompt", () => {
  it("returns prompt by id with body", async () => {
    const all = await listPrompts(db);
    const found = await getPrompt(db, all[0].id);
    expect(found?.name).toBe(all[0].name);
    expect(found?.body).toBe("...");
  });

  it("returns null for unknown id", async () => {
    const found = await getPrompt(db, "507f1f77bcf86cd799439011");
    expect(found).toBeNull();
  });

  it("returns null for malformed id", async () => {
    const found = await getPrompt(db, "not-a-valid-id");
    expect(found).toBeNull();
  });
});
