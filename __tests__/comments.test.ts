import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { addComment, listComments, deleteComment } from "../lib/comments";

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
  await db.collection("comments").deleteMany({});
  await db.collection("users").deleteMany({});
});

describe("comments", () => {
  it("adds a comment and lists it with resolved author", async () => {
    await db.collection("users").insertOne({ email: "a@x.com", name: "Adi", image: "http://img/a.png" });
    const { id } = await addComment(db, "prompt1", "a@x.com", "Great prompt!");
    expect(id).toBeTruthy();
    const list = await listComments(db, "prompt1");
    expect(list).toHaveLength(1);
    expect(list[0].body).toBe("Great prompt!");
    expect(list[0].author).toEqual({ email: "a@x.com", name: "Adi", image: "http://img/a.png" });
  });

  it("trims and rejects empty/whitespace comments", async () => {
    await expect(addComment(db, "p", "a@x.com", "   ")).rejects.toThrow();
  });

  it("lists comments newest-first and scoped to the prompt", async () => {
    await addComment(db, "p1", "a@x.com", "first");
    await addComment(db, "p1", "a@x.com", "second");
    await addComment(db, "p2", "a@x.com", "other prompt");
    const list = await listComments(db, "p1");
    expect(list.map((c) => c.body)).toEqual(["second", "first"]);
  });

  it("deletes only the comment author's comment", async () => {
    const { id } = await addComment(db, "p1", "a@x.com", "mine");
    expect(await deleteComment(db, id, "mallory@x.com")).toBe(false);
    expect(await deleteComment(db, id, "a@x.com")).toBe(true);
    expect(await listComments(db, "p1")).toHaveLength(0);
  });

  it("falls back to an email-derived name when no user row exists", async () => {
    await addComment(db, "p1", "ghost@x.com", "hi");
    const list = await listComments(db, "p1");
    expect(list[0].author).toEqual({ email: "ghost@x.com", name: "ghost", image: null });
  });

  it("returns false deleting a malformed id", async () => {
    expect(await deleteComment(db, "nope", "a@x.com")).toBe(false);
  });
});
