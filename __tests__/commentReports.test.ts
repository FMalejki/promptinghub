import { MongoClient, Db, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { reportComment, listOpenCommentReports, resolveCommentReport } from "../lib/commentReports";

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
  await db.collection("commentReports").deleteMany({});
});

async function comment(body: string) {
  const _id = new ObjectId();
  await db.collection("comments").insertOne({ _id, promptId: "p1", authorEmail: "a@x.com", body });
  return _id.toString();
}

describe("commentReports", () => {
  it("files a report for an existing comment", async () => {
    const cid = await comment("spam");
    expect(await reportComment(db, cid, "r@x.com", "spam")).toEqual({ ok: true });
    const open = await listOpenCommentReports(db);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ commentId: cid, reason: "spam", commentBody: "spam" });
  });

  it("defaults an empty reason rather than rejecting", async () => {
    const cid = await comment("x");
    expect(await reportComment(db, cid, "r@x.com", "")).toEqual({ ok: true });
    expect((await listOpenCommentReports(db))[0].reason).toBeTruthy();
  });

  it("dedupes repeated reports by the same reporter", async () => {
    const cid = await comment("x");
    await reportComment(db, cid, "r@x.com", "first");
    await reportComment(db, cid, "r@x.com", "second");
    expect(await listOpenCommentReports(db)).toHaveLength(1);
  });

  it("returns not_found for a malformed or missing comment id", async () => {
    expect(await reportComment(db, "nope", "r@x.com", "x")).toEqual({ ok: false, error: "not_found" });
    expect(await reportComment(db, "507f1f77bcf86cd799439011", "r@x.com", "x")).toEqual({ ok: false, error: "not_found" });
  });

  it("resolves a report so it leaves the open queue", async () => {
    const cid = await comment("x");
    await reportComment(db, cid, "r@x.com", "bad");
    const open = await listOpenCommentReports(db);
    expect(await resolveCommentReport(db, open[0].id, "dismissed")).toBe(true);
    expect(await listOpenCommentReports(db)).toHaveLength(0);
  });
});
