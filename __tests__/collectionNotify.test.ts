import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser } from "../lib/users";
import { createCollection } from "../lib/collections";
import { subscribeCollection } from "../lib/collectionFollows";
import { notifyCollectionSubscribers } from "../lib/collectionFollows";
import { listNotifications } from "../lib/notifications";

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
  for (const c of ["users", "collections", "collectionFollows", "notifications"])
    await db.collection(c).deleteMany({});
  await createUser(db, "owner@x.com", "pw", "Owner");
  await createUser(db, "sub1@x.com", "pw", "Sub One");
  await createUser(db, "sub2@x.com", "pw", "Sub Two");
});

describe("notifyCollectionSubscribers", () => {
  it("notifies every subscriber except the actor", async () => {
    const { id } = await createCollection(db, "owner@x.com", { name: "Pack" });
    await subscribeCollection(db, "sub1@x.com", id);
    await subscribeCollection(db, "sub2@x.com", id);
    await subscribeCollection(db, "owner@x.com", id); // actor also subscribed

    const n = await notifyCollectionSubscribers(db, id, "owner@x.com", "Cold Email");
    expect(n).toBe(2);

    const s1 = await listNotifications(db, "sub1@x.com");
    expect(s1).toHaveLength(1);
    expect(s1[0].type).toBe("collection");
    expect(s1[0].text).toContain("Pack");
    expect(s1[0].promptName).toBe("Cold Email");

    // actor does not notify themselves
    expect(await listNotifications(db, "owner@x.com")).toHaveLength(0);
  });

  it("returns 0 when nobody is subscribed", async () => {
    const { id } = await createCollection(db, "owner@x.com", { name: "Pack" });
    expect(await notifyCollectionSubscribers(db, id, "owner@x.com", "X")).toBe(0);
  });

  it("is a no-op for an unknown collection", async () => {
    expect(await notifyCollectionSubscribers(db, "0123456789abcdef01234567", "owner@x.com", "X")).toBe(0);
  });
});
