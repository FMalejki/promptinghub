import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { addNotification, listNotifications, sanitizeMutedTypes, NOTIFICATION_TYPES } from "../lib/notifications";

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
  await db.collection("notifications").deleteMany({});
  await db.collection("users").deleteMany({});
});

const RECIPIENT = "rcpt@x.com";
const ACTOR = "actor@y.com";

describe("sanitizeMutedTypes", () => {
  it("keeps only valid, deduped notification types", () => {
    expect(sanitizeMutedTypes(["follow", "follow", "bogus", "share"])).toEqual(["follow", "share"]);
    expect(sanitizeMutedTypes("not-an-array")).toEqual([]);
    expect(sanitizeMutedTypes([1, null, "comment"])).toEqual(["comment"]);
    // every canonical type survives
    expect(sanitizeMutedTypes(NOTIFICATION_TYPES)).toEqual(NOTIFICATION_TYPES);
  });
});

describe("addNotification respects muted types", () => {
  it("skips a notification whose type the recipient has muted", async () => {
    await db.collection("users").insertOne({ email: RECIPIENT, mutedNotificationTypes: ["follow"] });
    await addNotification(db, { recipientEmail: RECIPIENT, type: "follow", actorEmail: ACTOR });
    expect(await listNotifications(db, RECIPIENT)).toHaveLength(0);
  });

  it("delivers a notification type the recipient has NOT muted", async () => {
    await db.collection("users").insertOne({ email: RECIPIENT, mutedNotificationTypes: ["follow"] });
    await addNotification(db, { recipientEmail: RECIPIENT, type: "comment", actorEmail: ACTOR });
    const got = await listNotifications(db, RECIPIENT);
    expect(got).toHaveLength(1);
    expect(got[0].type).toBe("comment");
  });

  it("delivers all types when the user has no preferences set", async () => {
    await db.collection("users").insertOne({ email: RECIPIENT });
    await addNotification(db, { recipientEmail: RECIPIENT, type: "share", actorEmail: ACTOR });
    expect(await listNotifications(db, RECIPIENT)).toHaveLength(1);
  });

  it("still never self-notifies, regardless of prefs", async () => {
    await db.collection("users").insertOne({ email: RECIPIENT, mutedNotificationTypes: [] });
    await addNotification(db, { recipientEmail: RECIPIENT, type: "follow", actorEmail: RECIPIENT });
    expect(await listNotifications(db, RECIPIENT)).toHaveLength(0);
  });
});
