import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { addNotification, listNotifications, countUnread, markAllRead, markRead } from "../lib/notifications";
import { createUser, ensureHandle } from "../lib/users";
import { createPrompt } from "../lib/prompts";
import { addComment } from "../lib/comments";
import { followCreator } from "../lib/follows";

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
  for (const c of ["users", "prompts", "comments", "follows", "notifications"]) await db.collection(c).deleteMany({});
});

describe("notifications core", () => {
  it("adds, lists newest-first, counts unread, and marks all read", async () => {
    await addNotification(db, { recipientEmail: "me@x.com", type: "follow", actorEmail: "a@x.com" });
    await addNotification(db, { recipientEmail: "me@x.com", type: "comment", actorEmail: "b@x.com", text: "nice" });
    expect(await countUnread(db, "me@x.com")).toBe(2);

    const list = await listNotifications(db, "me@x.com");
    expect(list.map((n) => n.type)).toEqual(["comment", "follow"]);

    expect(await markAllRead(db, "me@x.com")).toBe(2);
    expect(await countUnread(db, "me@x.com")).toBe(0);
  });

  it("never notifies yourself", async () => {
    await addNotification(db, { recipientEmail: "me@x.com", type: "follow", actorEmail: "me@x.com" });
    expect(await countUnread(db, "me@x.com")).toBe(0);
  });

  it("marks a single notification read, scoped to its recipient", async () => {
    await addNotification(db, { recipientEmail: "me@x.com", type: "follow", actorEmail: "a@x.com" });
    await addNotification(db, { recipientEmail: "me@x.com", type: "comment", actorEmail: "b@x.com" });
    const list = await listNotifications(db, "me@x.com");
    expect(await markRead(db, list[0].id, "me@x.com")).toBe(true);
    expect(await countUnread(db, "me@x.com")).toBe(1);
    // someone else can't mark my notification read
    expect(await markRead(db, list[1].id, "intruder@x.com")).toBe(false);
    expect(await countUnread(db, "me@x.com")).toBe(1);
    // malformed id
    expect(await markRead(db, "nope", "me@x.com")).toBe(false);
  });
});

describe("notification emission from events", () => {
  beforeEach(async () => {
    await createUser(db, "owner@x.com", "pw", "Owner");
    await createUser(db, "fan@x.com", "pw", "Fan");
    await ensureHandle(db, "owner@x.com");
    await ensureHandle(db, "fan@x.com");
  });

  it("notifies on a new follow (once)", async () => {
    await followCreator(db, "fan@x.com", "owner");
    await followCreator(db, "fan@x.com", "owner"); // repeat — no second notif
    const list = await listNotifications(db, "owner@x.com");
    expect(list.filter((n) => n.type === "follow")).toHaveLength(1);
  });

  it("notifies the prompt owner on a comment (not on own comment)", async () => {
    const p = await createPrompt(db, "owner@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    await addComment(db, p.id, "fan@x.com", "great prompt");
    await addComment(db, p.id, "owner@x.com", "thanks"); // self — no notif
    const list = await listNotifications(db, "owner@x.com");
    expect(list.filter((n) => n.type === "comment")).toHaveLength(1);
  });

  it("notifies the source owner on a fork", async () => {
    const src = await createPrompt(db, "owner@x.com", { name: "Src", description: "d", category: "Writing", body: "x" });
    await createPrompt(db, "fan@x.com", { name: "Src (fork)", description: "d", category: "Writing", body: "x", forkedFrom: src.id });
    const list = await listNotifications(db, "owner@x.com");
    expect(list.filter((n) => n.type === "fork")).toHaveLength(1);
  });
});
