import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt } from "../lib/prompts";
import {
  createCollection,
  getCollection,
  getCollectionDetail,
  listCollectionsByOwner,
  addPromptToCollection,
  removePromptFromCollection,
  deleteCollection,
} from "../lib/collections";

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
  await db.collection("collections").deleteMany({});
  await db.collection("prompts").deleteMany({});
});

describe("collections", () => {
  it("creates a collection with a slug and empty prompt list", async () => {
    const { id, slug } = await createCollection(db, "a@x.com", { name: "Best Cold Emails", description: "curated" });
    expect(slug).toBe("best-cold-emails");
    const c = await getCollection(db, id);
    expect(c?.name).toBe("Best Cold Emails");
    expect(c?.promptIds).toEqual([]);
    expect(c?.ownerEmail).toBe("a@x.com");
  });

  it("gives the same owner unique slugs for duplicate names", async () => {
    const a = await createCollection(db, "a@x.com", { name: "Faves" });
    const b = await createCollection(db, "a@x.com", { name: "Faves" });
    expect(a.slug).toBe("faves");
    expect(b.slug).toBe("faves-2");
  });

  it("adds and removes prompts (owner-scoped, deduped, ordered)", async () => {
    const { id } = await createCollection(db, "a@x.com", { name: "C" });
    const p1 = await createPrompt(db, "a@x.com", { name: "P1", description: "d", category: "Writing", body: "b" });
    const p2 = await createPrompt(db, "a@x.com", { name: "P2", description: "d", category: "Writing", body: "b" });

    expect(await addPromptToCollection(db, id, "a@x.com", p1.id)).toBe(true);
    expect(await addPromptToCollection(db, id, "a@x.com", p2.id)).toBe(true);
    expect(await addPromptToCollection(db, id, "a@x.com", p1.id)).toBe(true); // dedup, still ok
    expect((await getCollection(db, id))?.promptIds).toEqual([p1.id, p2.id]);

    // non-owner cannot modify
    expect(await addPromptToCollection(db, id, "mallory@x.com", p2.id)).toBe(false);
    expect(await removePromptFromCollection(db, id, "mallory@x.com", p1.id)).toBe(false);

    expect(await removePromptFromCollection(db, id, "a@x.com", p1.id)).toBe(true);
    expect((await getCollection(db, id))?.promptIds).toEqual([p2.id]);
  });

  it("getCollectionDetail resolves prompts in saved order", async () => {
    const { id } = await createCollection(db, "a@x.com", { name: "C" });
    const p1 = await createPrompt(db, "a@x.com", { name: "First", description: "d", category: "Writing", body: "b" });
    const p2 = await createPrompt(db, "a@x.com", { name: "Second", description: "d", category: "Coding", body: "b" });
    await addPromptToCollection(db, id, "a@x.com", p2.id);
    await addPromptToCollection(db, id, "a@x.com", p1.id);
    const detail = await getCollectionDetail(db, id);
    expect(detail?.prompts.map((p) => p.name)).toEqual(["Second", "First"]);
  });

  it("lists an owner's collections", async () => {
    await createCollection(db, "a@x.com", { name: "One" });
    await createCollection(db, "a@x.com", { name: "Two" });
    await createCollection(db, "b@x.com", { name: "Other" });
    const mine = await listCollectionsByOwner(db, "a@x.com");
    expect(mine.map((c) => c.name).sort()).toEqual(["One", "Two"]);
  });

  it("deletes only the owner's collection", async () => {
    const { id } = await createCollection(db, "a@x.com", { name: "C" });
    expect(await deleteCollection(db, id, "mallory@x.com")).toBe(false);
    expect(await deleteCollection(db, id, "a@x.com")).toBe(true);
    expect(await getCollection(db, id)).toBeNull();
  });

  it("returns null/false for malformed ids", async () => {
    expect(await getCollection(db, "nope")).toBeNull();
    expect(await getCollectionDetail(db, "nope")).toBeNull();
    expect(await addPromptToCollection(db, "nope", "a@x.com", "x")).toBe(false);
  });
});
