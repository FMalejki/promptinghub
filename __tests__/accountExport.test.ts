import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser, updateProfile, exportAccountData } from "../lib/users";
import { createPrompt } from "../lib/prompts";
import { createCollection } from "../lib/collections";

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

describe("exportAccountData", () => {
  it("returns the profile plus all owned prompts and collections", async () => {
    await createUser(db, "me@x.com", "pw", "Me");
    await updateProfile(db, "me@x.com", { name: "Me", image: null });
    await createPrompt(db, "me@x.com", { name: "P1", description: "d", category: "Writing", body: "hi", tags: ["seo"] });
    await createPrompt(db, "other@x.com", { name: "NotMine", description: "d", category: "Writing", body: "x" });
    await createCollection(db, "me@x.com", { name: "List", description: "c" });

    const data = await exportAccountData(db, "me@x.com");
    expect(data).not.toBeNull();
    expect(data!.email).toBe("me@x.com");
    expect(data!.profile.name).toBe("Me");
    expect(data!.prompts.map((p) => p.name)).toEqual(["P1"]);
    expect(data!.prompts[0]).toMatchObject({ category: "Writing", tags: ["seo"], body: "hi" });
    expect(data!.collections.map((c) => c.name)).toEqual(["List"]);
    expect(data!.exportedAt).toBeInstanceOf(Date);
  });

  it("never includes the password hash", async () => {
    await createUser(db, "me@x.com", "secretpw");
    const data = await exportAccountData(db, "me@x.com");
    expect(JSON.stringify(data)).not.toContain("secretpw");
    expect((data!.profile as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it("returns null for an unknown account", async () => {
    expect(await exportAccountData(db, "ghost@x.com")).toBeNull();
  });
});
