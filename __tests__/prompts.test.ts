import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { listPrompts, getPrompt, listCategories } from "../lib/prompts";

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
    { ownerEmail: "alice@x.com", name: "Summarize", description: "Summarize any text", category: "Writing", body: "..." },
    { ownerEmail: "alice@x.com", name: "Code review", description: "Review code for bugs", category: "Coding", body: "..." },
    { ownerEmail: "alice@x.com", name: "Polish translator", description: "Translate to Polish", category: "Writing", body: "..." },
    { ownerEmail: "bob@x.com", name: "SQL builder", description: "Generate SQL", category: "Coding", body: "..." },
  ]);
});

describe("listPrompts", () => {
  it("returns only prompts owned by the user", async () => {
    const rows = await listPrompts(db, "alice@x.com");
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.name !== "SQL builder")).toBe(true);
  });

  it("returns nothing for a user with no prompts", async () => {
    expect(await listPrompts(db, "nobody@x.com")).toEqual([]);
  });

  it("filters by query on name (case-insensitive)", async () => {
    const rows = await listPrompts(db, "alice@x.com", { q: "code" });
    expect(rows.map((r) => r.name)).toEqual(["Code review"]);
  });

  it("filters by query on description", async () => {
    const rows = await listPrompts(db, "alice@x.com", { q: "polish" });
    expect(rows.map((r) => r.name)).toEqual(["Polish translator"]);
  });

  it("filters by category", async () => {
    const rows = await listPrompts(db, "alice@x.com", { category: "Writing" });
    expect(rows.map((r) => r.name).sort()).toEqual(["Polish translator", "Summarize"]);
  });

  it("combines query and category", async () => {
    const rows = await listPrompts(db, "alice@x.com", { q: "summary", category: "Coding" });
    expect(rows).toEqual([]);
  });

  it("exposes category in returned shape", async () => {
    const rows = await listPrompts(db, "alice@x.com");
    expect(rows[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String), category: expect.any(String) }));
  });
});

describe("listCategories", () => {
  it("returns distinct categories for the user, sorted", async () => {
    expect(await listCategories(db, "alice@x.com")).toEqual(["Coding", "Writing"]);
  });

  it("returns empty array for a user with no prompts", async () => {
    expect(await listCategories(db, "nobody@x.com")).toEqual([]);
  });
});

describe("getPrompt", () => {
  it("returns owned prompt with body", async () => {
    const [p] = await listPrompts(db, "alice@x.com");
    const found = await getPrompt(db, p.id, "alice@x.com");
    expect(found?.body).toBe("...");
    expect(found?.name).toBe(p.name);
  });

  it("returns null if the prompt is owned by someone else", async () => {
    const bobs = await listPrompts(db, "bob@x.com");
    const found = await getPrompt(db, bobs[0].id, "alice@x.com");
    expect(found).toBeNull();
  });

  it("returns null for unknown id", async () => {
    expect(await getPrompt(db, "507f1f77bcf86cd799439011", "alice@x.com")).toBeNull();
  });

  it("returns null for malformed id", async () => {
    expect(await getPrompt(db, "not-a-valid-id", "alice@x.com")).toBeNull();
  });
});
