import { MongoClient, Db, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { toggleCommentLike, getCommentLikes } from "../lib/commentLikes";

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
  await db.collection("commentLikes").deleteMany({});
});

describe("commentLikes", () => {
  const cid = new ObjectId().toString();

  it("toggles a like on and off, tracking the count", async () => {
    const on = await toggleCommentLike(db, cid, "a@x.com");
    expect(on).toEqual({ liked: true, count: 1 });
    const off = await toggleCommentLike(db, cid, "a@x.com");
    expect(off).toEqual({ liked: false, count: 0 });
  });

  it("counts distinct users and is idempotent per user", async () => {
    await toggleCommentLike(db, cid, "a@x.com");
    await toggleCommentLike(db, cid, "b@x.com");
    const again = await toggleCommentLike(db, cid, "b@x.com"); // b unlikes
    expect(again).toEqual({ liked: false, count: 1 });
  });

  it("returns null for a malformed comment id", async () => {
    expect(await toggleCommentLike(db, "nope", "a@x.com")).toBeNull();
  });

  it("getCommentLikes returns counts and the viewer's liked flag", async () => {
    const c1 = new ObjectId().toString();
    const c2 = new ObjectId().toString();
    await toggleCommentLike(db, c1, "a@x.com");
    await toggleCommentLike(db, c1, "b@x.com");
    await toggleCommentLike(db, c2, "a@x.com");
    const map = await getCommentLikes(db, [c1, c2], "b@x.com");
    expect(map[c1]).toEqual({ count: 2, liked: true });
    expect(map[c2]).toEqual({ count: 1, liked: false });
  });

  it("getCommentLikes with no viewer reports liked=false everywhere", async () => {
    const c1 = new ObjectId().toString();
    await toggleCommentLike(db, c1, "a@x.com");
    const map = await getCommentLikes(db, [c1]);
    expect(map[c1]).toEqual({ count: 1, liked: false });
  });

  it("getCommentLikes returns an empty object for no ids", async () => {
    expect(await getCommentLikes(db, [])).toEqual({});
  });
});
