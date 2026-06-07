import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser } from "../lib/users";
import { createCollection } from "../lib/collections";
import {
  subscribeCollection,
  unsubscribeCollection,
  isSubscribed,
  countSubscribers,
  listSubscribedCollectionIds,
} from "../lib/collectionFollows";

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
  for (const c of ["users", "collections", "collectionFollows"]) await db.collection(c).deleteMany({});
  await createUser(db, "me@x.com", "pw", "Me");
  await createUser(db, "bob@x.com", "pw", "Bob");
});

describe("collectionFollows", () => {
  it("subscribes, counts and unsubscribes", async () => {
    const { id } = await createCollection(db, "bob@x.com", { name: "Pack" });

    expect(await subscribeCollection(db, "me@x.com", id)).toBe(true);
    expect(await subscribeCollection(db, "me@x.com", id)).toBe(false); // idempotent
    expect(await isSubscribed(db, "me@x.com", id)).toBe(true);
    expect(await countSubscribers(db, id)).toBe(1);
    expect(await listSubscribedCollectionIds(db, "me@x.com")).toEqual([id]);

    expect(await unsubscribeCollection(db, "me@x.com", id)).toBe(true);
    expect(await isSubscribed(db, "me@x.com", id)).toBe(false);
    expect(await countSubscribers(db, id)).toBe(0);
  });

  it("rejects an unknown or malformed collection id", async () => {
    expect(await subscribeCollection(db, "me@x.com", "not-an-id")).toBe(false);
    expect(await subscribeCollection(db, "me@x.com", "0123456789abcdef01234567")).toBe(false);
    expect(await countSubscribers(db, "not-an-id")).toBe(0);
  });

  it("does not let an owner inflate by self-subscribing twice", async () => {
    const { id } = await createCollection(db, "bob@x.com", { name: "Pack" });
    await subscribeCollection(db, "bob@x.com", id);
    await subscribeCollection(db, "bob@x.com", id);
    expect(await countSubscribers(db, id)).toBe(1);
  });
});
