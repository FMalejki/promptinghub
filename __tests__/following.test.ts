import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser, ensureHandle } from "../lib/users";
import { createCollection } from "../lib/collections";
import { followCreator } from "../lib/follows";
import { followTag } from "../lib/tagFollows";
import { subscribeCollection } from "../lib/collectionFollows";
import { getFollowingSummary } from "../lib/following";

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
  for (const c of ["users", "collections", "follows", "tagFollows", "collectionFollows"])
    await db.collection(c).deleteMany({});
  await createUser(db, "me@x.com", "pw", "Me");
  await createUser(db, "bob@x.com", "pw", "Bob");
  await ensureHandle(db, "bob@x.com");
});

describe("getFollowingSummary", () => {
  it("collects followed creators, tags and subscribed collections", async () => {
    await followCreator(db, "me@x.com", "bob");
    await followTag(db, "me@x.com", "SEO");
    await followTag(db, "me@x.com", "coding");
    const { id } = await createCollection(db, "bob@x.com", { name: "Bob's Pack" });
    await subscribeCollection(db, "me@x.com", id);

    const s = await getFollowingSummary(db, "me@x.com");
    expect(s.creators).toEqual(["bob"]);
    expect(s.tags.sort()).toEqual(["coding", "seo"]);
    expect(s.collections).toEqual([{ id, name: "Bob's Pack" }]);
  });

  it("returns empty arrays when following nothing", async () => {
    const s = await getFollowingSummary(db, "me@x.com");
    expect(s).toEqual({ creators: [], tags: [], collections: [] });
  });

  it("drops a subscribed collection that was deleted", async () => {
    const { id } = await createCollection(db, "bob@x.com", { name: "Gone" });
    await subscribeCollection(db, "me@x.com", id);
    await db.collection("collections").deleteMany({});
    const s = await getFollowingSummary(db, "me@x.com");
    expect(s.collections).toEqual([]);
  });
});
