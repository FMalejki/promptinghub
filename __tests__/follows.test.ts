import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser, ensureHandle } from "../lib/users";
import { createPrompt } from "../lib/prompts";
import { followCreator, unfollowCreator, isFollowing, listFollowingHandles, countFollowers, followingFeed } from "../lib/follows";

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
  for (const c of ["users", "prompts", "follows"]) await db.collection(c).deleteMany({});
  await createUser(db, "me@x.com", "pw", "Me");
  await createUser(db, "bob@x.com", "pw", "Bob");
  await ensureHandle(db, "me@x.com");
  await ensureHandle(db, "bob@x.com");
});

describe("follows", () => {
  it("follows and unfollows a creator by handle", async () => {
    expect(await followCreator(db, "me@x.com", "bob")).toBe(true);
    expect(await isFollowing(db, "me@x.com", "bob")).toBe(true);
    expect(await countFollowers(db, "bob")).toBe(1);
    expect(await listFollowingHandles(db, "me@x.com")).toEqual(["bob"]);

    expect(await unfollowCreator(db, "me@x.com", "bob")).toBe(true);
    expect(await isFollowing(db, "me@x.com", "bob")).toBe(false);
    expect(await countFollowers(db, "bob")).toBe(0);
  });

  it("refuses to follow yourself or an unknown handle", async () => {
    expect(await followCreator(db, "me@x.com", "me")).toBe(false);
    expect(await followCreator(db, "me@x.com", "ghost")).toBe(false);
  });

  it("is idempotent (no duplicate follow rows)", async () => {
    await followCreator(db, "me@x.com", "bob");
    await followCreator(db, "me@x.com", "bob");
    expect(await countFollowers(db, "bob")).toBe(1);
  });

  it("following feed shows public prompts from followed creators, newest first", async () => {
    await createUser(db, "carol@x.com", "pw", "Carol");
    await ensureHandle(db, "carol@x.com");
    await followCreator(db, "me@x.com", "bob");

    await createPrompt(db, "bob@x.com", { name: "Bob1", description: "d", category: "Writing", body: "x" });
    await createPrompt(db, "bob@x.com", { name: "Bob2", description: "d", category: "Writing", body: "x" });
    await createPrompt(db, "bob@x.com", { name: "BobPriv", description: "d", category: "Writing", body: "x", isPrivate: true });
    await createPrompt(db, "carol@x.com", { name: "Carol1", description: "d", category: "Writing", body: "x" });

    const feed = await followingFeed(db, "me@x.com");
    expect(feed.map((p) => p.name)).toEqual(["Bob2", "Bob1"]);
  });

  it("empty feed when following nobody", async () => {
    expect(await followingFeed(db, "me@x.com")).toEqual([]);
  });
});
