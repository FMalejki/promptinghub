import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser, ensureHandle } from "../lib/users";
import { createPrompt } from "../lib/prompts";
import {
  followTag,
  unfollowTag,
  isFollowingTag,
  listFollowedTags,
  tagFeed,
} from "../lib/tagFollows";

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
  for (const c of ["users", "prompts", "tagFollows"]) await db.collection(c).deleteMany({});
  await createUser(db, "me@x.com", "pw", "Me");
  await createUser(db, "bob@x.com", "pw", "Bob");
  await ensureHandle(db, "bob@x.com");
});

describe("tagFollows", () => {
  it("follows, lists and unfollows tags (normalized, deduped)", async () => {
    expect(await followTag(db, "me@x.com", "SEO")).toBe(true);
    expect(await followTag(db, "me@x.com", "  seo ")).toBe(false); // already following (normalized)
    expect(await followTag(db, "me@x.com", "Coding")).toBe(true);

    expect(await isFollowingTag(db, "me@x.com", "seo")).toBe(true);
    expect((await listFollowedTags(db, "me@x.com")).sort()).toEqual(["coding", "seo"]);

    expect(await unfollowTag(db, "me@x.com", "SEO")).toBe(true);
    expect(await isFollowingTag(db, "me@x.com", "seo")).toBe(false);
    expect(await listFollowedTags(db, "me@x.com")).toEqual(["coding"]);
  });

  it("rejects an empty tag", async () => {
    expect(await followTag(db, "me@x.com", "   ")).toBe(false);
    expect(await listFollowedTags(db, "me@x.com")).toEqual([]);
  });

  it("feeds public prompts carrying any followed tag, newest first", async () => {
    await createPrompt(db, "bob@x.com", {
      name: "Old SEO",
      description: "d",
      category: "Writing",
      tags: ["seo"],
      files: [{ path: "p.md", content: "x" }],
    } as any);
    await createPrompt(db, "bob@x.com", {
      name: "New Coding",
      description: "d",
      category: "Coding",
      tags: ["coding"],
      files: [{ path: "p.md", content: "x" }],
    } as any);
    await createPrompt(db, "bob@x.com", {
      name: "Untagged",
      description: "d",
      category: "Writing",
      tags: ["random"],
      files: [{ path: "p.md", content: "x" }],
    } as any);

    await followTag(db, "me@x.com", "seo");
    await followTag(db, "me@x.com", "coding");

    const feed = await tagFeed(db, "me@x.com");
    expect(feed.map((p) => p.name)).toEqual(["New Coding", "Old SEO"]);
  });

  it("returns an empty feed when following no tags", async () => {
    expect(await tagFeed(db, "me@x.com")).toEqual([]);
  });

  it("excludes private prompts from the feed", async () => {
    await createPrompt(db, "bob@x.com", {
      name: "Secret",
      description: "d",
      category: "Writing",
      tags: ["seo"],
      isPrivate: true,
      files: [{ path: "p.md", content: "x" }],
    } as any);
    await followTag(db, "me@x.com", "seo");
    expect(await tagFeed(db, "me@x.com")).toEqual([]);
  });
});
