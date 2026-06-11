import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createCollection, addPromptToCollection, listPublicCollections } from "../lib/collections";
import { createPrompt } from "../lib/prompts";
import { createUser, updateProfile, ensureHandle } from "../lib/users";

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
  for (const c of ["users", "prompts", "collections"]) await db.collection(c).deleteMany({});
});

describe("listPublicCollections", () => {
  it("lists only non-empty collections, newest first, with prompt count and owner", async () => {
    await createUser(db, "a@x.com", "pw", "Alice");
    await updateProfile(db, "a@x.com", { name: "Alice" });
    await ensureHandle(db, "a@x.com");

    const empty = await createCollection(db, "a@x.com", { name: "Empty", description: "" });
    const full = await createCollection(db, "a@x.com", { name: "Full", description: "good ones" });
    const p = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    await addPromptToCollection(db, full.id, "a@x.com", p.id);

    const list = await listPublicCollections(db);
    expect(list.map((c) => c.name)).toEqual(["Full"]);
    expect(list[0]).toMatchObject({ id: full.id, promptCount: 1, description: "good ones" });
    expect(list[0].owner.name).toBe("Alice");
    expect(typeof list[0].owner.handle).toBe("string");
    // SEC: the public collection shape must never leak the owner's email.
    expect(list[0].owner).not.toHaveProperty("email");
    expect(JSON.stringify(list[0])).not.toContain("a@x.com");
    expect(empty.id).toBeTruthy();
  });

  it("respects the limit", async () => {
    const p = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    for (let i = 0; i < 3; i++) {
      const c = await createCollection(db, "a@x.com", { name: `C${i}`, description: "" });
      await addPromptToCollection(db, c.id, "a@x.com", p.id);
    }
    expect(await listPublicCollections(db, 2)).toHaveLength(2);
  });
});
