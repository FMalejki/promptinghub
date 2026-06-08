import { MongoClient, Db, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { listMoreByAuthor } from "../lib/prompts";

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
  await db.collection("users").deleteMany({});
});

async function prompt(owner: string, name: string, opts: { private?: boolean; copies?: number } = {}) {
  const _id = new ObjectId();
  await db.collection("prompts").insertOne({
    _id,
    ownerEmail: owner,
    name,
    description: "d",
    category: "Misc",
    isPrivate: !!opts.private,
    copyCount: opts.copies ?? 0,
    starredBy: [],
  });
  return _id.toString();
}

describe("listMoreByAuthor", () => {
  it("returns other public prompts by the same author, excluding the current one", async () => {
    const a1 = await prompt("alice@x.com", "A1", { copies: 1 });
    await prompt("alice@x.com", "A2", { copies: 5 });
    await prompt("bob@x.com", "B1", { copies: 9 });
    const more = await listMoreByAuthor(db, a1);
    const names = more.map((p) => p.name);
    expect(names).toContain("A2");
    expect(names).not.toContain("A1"); // current excluded
    expect(names).not.toContain("B1"); // different author
  });

  it("orders by most-copied", async () => {
    const a1 = await prompt("alice@x.com", "A1");
    await prompt("alice@x.com", "low", { copies: 1 });
    await prompt("alice@x.com", "high", { copies: 50 });
    const more = await listMoreByAuthor(db, a1);
    expect(more[0].name).toBe("high");
  });

  it("excludes the author's private prompts", async () => {
    const a1 = await prompt("alice@x.com", "A1");
    await prompt("alice@x.com", "secret", { private: true });
    const more = await listMoreByAuthor(db, a1);
    expect(more.map((p) => p.name)).not.toContain("secret");
  });

  it("returns [] for a malformed or unknown id", async () => {
    expect(await listMoreByAuthor(db, "nope")).toEqual([]);
    expect(await listMoreByAuthor(db, "507f1f77bcf86cd799439011")).toEqual([]);
  });

  it("returns [] when the author has no other public prompts", async () => {
    const a1 = await prompt("alice@x.com", "Only");
    expect(await listMoreByAuthor(db, a1)).toEqual([]);
  });
});
