import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { recommendCreators } from "../lib/follows";

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
  await db.collection("users").deleteMany({});
  await db.collection("prompts").deleteMany({});
  await db.collection("follows").deleteMany({});
});

// Seed a creator with `n` public prompts so topCreators ranks them.
async function creator(handle: string, email: string, n: number) {
  await db.collection("users").insertOne({ email, handle, name: handle });
  for (let i = 0; i < n; i++) {
    await db.collection("prompts").insertOne({ ownerEmail: email, name: `${handle}-${i}`, isPrivate: false, starredBy: [] });
  }
}

describe("recommendCreators", () => {
  it("excludes the viewer and creators they already follow", async () => {
    await creator("alice", "a@x.com", 5);
    await creator("bob", "b@x.com", 4);
    await creator("carol", "c@x.com", 3);
    await creator("me", "me@x.com", 2);
    // me follows alice
    await db.collection("follows").insertOne({ followerEmail: "me@x.com", targetEmail: "a@x.com" });

    const recs = await recommendCreators(db, "me@x.com", 10);
    const handles = recs.map((r) => r.handle);
    expect(handles).not.toContain("me"); // self excluded
    expect(handles).not.toContain("alice"); // already followed
    expect(handles).toContain("bob");
    expect(handles).toContain("carol");
  });

  it("respects the limit", async () => {
    await creator("alice", "a@x.com", 5);
    await creator("bob", "b@x.com", 4);
    await creator("carol", "c@x.com", 3);
    const recs = await recommendCreators(db, "nobody@x.com", 2);
    expect(recs).toHaveLength(2);
  });

  it("works for an anonymous viewer (no email)", async () => {
    await creator("alice", "a@x.com", 5);
    const recs = await recommendCreators(db, undefined, 10);
    expect(recs.map((r) => r.handle)).toContain("alice");
  });

  it("returns an empty list when there are no creators", async () => {
    expect(await recommendCreators(db, "me@x.com", 10)).toEqual([]);
  });
});
