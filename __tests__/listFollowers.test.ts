import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { followCreator, listFollowers } from "../lib/follows";

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
  await db.collection("follows").deleteMany({});
});

async function user(handle: string, email: string, name: string) {
  await db.collection("users").insertOne({ email, handle, name, image: `http://img/${handle}` });
}

describe("listFollowers", () => {
  it("returns the creators following a handle, newest follow first", async () => {
    await user("target", "t@x.com", "Target");
    await user("alice", "a@x.com", "Alice");
    await user("bob", "b@x.com", "Bob");
    await followCreator(db, "a@x.com", "target");
    await followCreator(db, "b@x.com", "target");

    const followers = await listFollowers(db, "target");
    // bob followed last → newest first
    expect(followers.map((f) => f.handle)).toEqual(["bob", "alice"]);
    expect(followers[0]).toMatchObject({ handle: "bob", name: "Bob", image: "http://img/bob" });
  });

  it("returns an empty list for a creator with no followers", async () => {
    await user("lonely", "l@x.com", "Lonely");
    expect(await listFollowers(db, "lonely")).toEqual([]);
  });

  it("returns an empty list for an unknown handle", async () => {
    expect(await listFollowers(db, "ghost")).toEqual([]);
  });

  it("falls back to an email-derived name for followers without one", async () => {
    await user("target", "t@x.com", "Target");
    await db.collection("users").insertOne({ email: "nameless@x.com", handle: "nameless" });
    await followCreator(db, "nameless@x.com", "target");
    const followers = await listFollowers(db, "target");
    expect(followers[0].name).toBe("nameless");
  });
});
