import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { categoryExists, tagExists } from "../lib/prompts";

// Backs the 404 guards on /c/[category] and /t/[tag]: a real entity returns true,
// a typo URL returns false, and (deliberately) a private-only category/tag still
// counts as existing so we never hide a page a signed-in owner could fill.
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
    { ownerEmail: "a@x.com", name: "Pub", description: "d", category: "Writing", body: "b", tags: ["email", "tone"] },
    { ownerEmail: "a@x.com", name: "Priv", description: "d", category: "Secret", body: "b", tags: ["hidden"], isPrivate: true },
  ]);
});

describe("categoryExists", () => {
  it("is true for a category in use", async () => {
    expect(await categoryExists(db, "Writing")).toBe(true);
  });
  it("is false for an unused category", async () => {
    expect(await categoryExists(db, "Nonsense")).toBe(false);
  });
  it("is false for an empty string", async () => {
    expect(await categoryExists(db, "")).toBe(false);
  });
  it("counts a private-only category as existing", async () => {
    expect(await categoryExists(db, "Secret")).toBe(true);
  });
});

describe("tagExists", () => {
  it("is true for a tag in use (case/space-normalized)", async () => {
    expect(await tagExists(db, "Email")).toBe(true);
    expect(await tagExists(db, "  tone ")).toBe(true);
  });
  it("is false for an unused tag", async () => {
    expect(await tagExists(db, "nope")).toBe(false);
  });
  it("is false for an empty/blank tag", async () => {
    expect(await tagExists(db, "   ")).toBe(false);
  });
  it("counts a private-only tag as existing", async () => {
    expect(await tagExists(db, "hidden")).toBe(true);
  });
});
