import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser, deleteAccount } from "../lib/users";
import { createPrompt, updatePrompt, toggleStar } from "../lib/prompts";
import { createCollection } from "../lib/collections";
import { addComment } from "../lib/comments";
import { createApiKey } from "../lib/apiKeys";

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
  for (const c of ["users", "prompts", "promptVersions", "collections", "comments", "apiKeys"]) {
    await db.collection(c).deleteMany({});
  }
});

describe("deleteAccount", () => {
  it("removes the user and all their owned content, and returns counts", async () => {
    await createUser(db, "me@x.com", "pw");
    const p1 = await createPrompt(db, "me@x.com", { name: "Mine", description: "d", category: "Writing", body: "v1" });
    await updatePrompt(db, p1.id, "me@x.com", { body: "v2" }); // creates a promptVersion
    await createCollection(db, "me@x.com", { name: "My list", description: "" });
    await addComment(db, "somePrompt", "me@x.com", "hello");
    await createApiKey(db, "me@x.com", "key1");

    const summary = await deleteAccount(db, "me@x.com");
    expect(summary).toEqual({ prompts: 1, collections: 1, comments: 1, apiKeys: 1 });

    expect(await db.collection("users").findOne({ email: "me@x.com" })).toBeNull();
    expect(await db.collection("prompts").countDocuments({ ownerEmail: "me@x.com" })).toBe(0);
    expect(await db.collection("promptVersions").countDocuments({ promptId: p1.id })).toBe(0);
    expect(await db.collection("collections").countDocuments({ ownerEmail: "me@x.com" })).toBe(0);
    expect(await db.collection("comments").countDocuments({ authorEmail: "me@x.com" })).toBe(0);
    expect(await db.collection("apiKeys").countDocuments({ ownerEmail: "me@x.com" })).toBe(0);
  });

  it("pulls the departing user from other prompts' stars and shares", async () => {
    await createUser(db, "me@x.com", "pw");
    const other = await createPrompt(db, "owner@x.com", { name: "Other", description: "d", category: "Writing", body: "x" });
    await toggleStar(db, other.id, "me@x.com");

    await deleteAccount(db, "me@x.com");
    const row = await db.collection("prompts").findOne({ ownerEmail: "owner@x.com" });
    expect(row?.starredBy || []).not.toContain("me@x.com");
  });

  it("returns null when the account does not exist", async () => {
    expect(await deleteAccount(db, "ghost@x.com")).toBeNull();
  });
});
