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
  await db.collection("prompts").deleteMany({});
  await db.collection("notifications").deleteMany({});
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

describe("comment threads + mentions", () => {
  const { ObjectId } = require("mongodb");

  it("stores parentId on a reply and returns it in the list", async () => {
    const top = await addComment(db, "p1", "a@x.com", "top-level");
    await addComment(db, "p1", "b@x.com", "a reply", top.id);
    const list = await listComments(db, "p1");
    const reply = list.find((c) => c.body === "a reply")!;
    const root = list.find((c) => c.body === "top-level")!;
    expect(reply.parentId).toBe(top.id);
    expect(root.parentId).toBeNull();
  });

  it("notifies the parent comment author on a reply", async () => {
    const top = await addComment(db, "p1", "owner@x.com", "first");
    await addComment(db, "p1", "replier@x.com", "thanks!", top.id);
    const notes = await db.collection("notifications").find({ recipientEmail: "owner@x.com" }).toArray();
    expect(notes.some((n) => n.type === "reply")).toBe(true);
  });

  it("notifies @mentioned users by handle, never the author, once each", async () => {
    await db.collection("users").insertMany([
      { email: "carol@x.com", handle: "carol", name: "Carol" },
      { email: "dave@x.com", handle: "dave", name: "Dave" },
    ]);
    const pid = new ObjectId();
    await db.collection("prompts").insertOne({ _id: pid, ownerEmail: "owner@x.com", name: "Cool" });
    await addComment(db, pid.toString(), "carol@x.com", "hey @dave and @carol check this");
    const dave = await db.collection("notifications").find({ recipientEmail: "dave@x.com" }).toArray();
    const carol = await db.collection("notifications").find({ recipientEmail: "carol@x.com" }).toArray();
    expect(dave.some((n) => n.type === "mention")).toBe(true);
    expect(carol).toHaveLength(0); // author mentioned themselves — no self-notify
  });

  it("does not double-notify when the prompt owner is also the parent author", async () => {
    const pid = new ObjectId();
    await db.collection("prompts").insertOne({ _id: pid, ownerEmail: "owner@x.com", name: "Cool" });
    const top = await addComment(db, pid.toString(), "owner@x.com", "my own prompt comment");
    await addComment(db, pid.toString(), "fan@x.com", "great work!", top.id);
    const owner = await db.collection("notifications").find({ recipientEmail: "owner@x.com" }).toArray();
    expect(owner).toHaveLength(1); // reply wins; not also a separate comment notification
    expect(owner[0].type).toBe("reply");
  });
});
