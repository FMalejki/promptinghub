import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApiKey, listApiKeys, revokeApiKey, verifyApiKey } from "../lib/apiKeys";

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
  await db.collection("apiKeys").deleteMany({});
});

describe("api keys", () => {
  it("creates a key (plaintext shown once) that verifies to its owner", async () => {
    const { key, prefix } = await createApiKey(db, "a@x.com", "CI");
    expect(key.startsWith("ph_")).toBe(true);
    expect(key.startsWith(prefix)).toBe(true);
    expect(await verifyApiKey(db, key)).toBe("a@x.com");
  });

  it("does not verify an unknown or malformed key", async () => {
    expect(await verifyApiKey(db, "ph_doesnotexist")).toBeNull();
    expect(await verifyApiKey(db, "")).toBeNull();
    expect(await verifyApiKey(db, "garbage")).toBeNull();
  });

  it("never stores or returns the raw key (only prefix + hash internally)", async () => {
    const { key } = await createApiKey(db, "a@x.com", "CI");
    const row = await db.collection("apiKeys").findOne({});
    expect(row?.keyHash).toBeTruthy();
    expect(JSON.stringify(row)).not.toContain(key);
    const list = await listApiKeys(db, "a@x.com");
    expect(list[0]).not.toHaveProperty("keyHash");
    expect(JSON.stringify(list)).not.toContain(key);
  });

  it("lists an owner's keys with metadata only", async () => {
    await createApiKey(db, "a@x.com", "One");
    await createApiKey(db, "a@x.com", "Two");
    await createApiKey(db, "b@x.com", "Other");
    const mine = await listApiKeys(db, "a@x.com");
    expect(mine.map((k) => k.name).sort()).toEqual(["One", "Two"]);
    expect(mine[0]).toHaveProperty("prefix");
    expect(mine[0]).toHaveProperty("id");
  });

  it("revokes only the owner's key, after which it no longer verifies", async () => {
    const { key } = await createApiKey(db, "a@x.com", "CI");
    const [k] = await listApiKeys(db, "a@x.com");
    expect(await revokeApiKey(db, k.id, "mallory@x.com")).toBe(false);
    expect(await revokeApiKey(db, k.id, "a@x.com")).toBe(true);
    expect(await verifyApiKey(db, key)).toBeNull();
  });
});
