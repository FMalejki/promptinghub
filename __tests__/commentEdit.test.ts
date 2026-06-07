import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { addComment, editComment, listComments, EDIT_WINDOW_MS } from "../lib/comments";

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

describe("editComment", () => {
  it("lets the author edit within the window and marks it edited", async () => {
    const { id } = await addComment(db, "p1", "a@x.com", "original");
    const res = await editComment(db, id, "a@x.com", "updated text");
    expect(res).toBe("ok");
    const list = await listComments(db, "p1");
    expect(list[0].body).toBe("updated text");
    expect(list[0].edited).toBe(true);
  });

  it("refuses a non-author", async () => {
    const { id } = await addComment(db, "p1", "a@x.com", "mine");
    expect(await editComment(db, id, "mallory@x.com", "hacked")).toBe("not_owner");
    const list = await listComments(db, "p1");
    expect(list[0].body).toBe("mine");
  });

  it("rejects an empty body", async () => {
    const { id } = await addComment(db, "p1", "a@x.com", "mine");
    expect(await editComment(db, id, "a@x.com", "   ")).toBe("empty");
  });

  it("refuses edits after the time window closes", async () => {
    const { id } = await addComment(db, "p1", "a@x.com", "mine");
    const future = new Date(Date.now() + EDIT_WINDOW_MS + 1000);
    expect(await editComment(db, id, "a@x.com", "too late", future)).toBe("expired");
  });

  it("returns not_found for a malformed or missing id", async () => {
    expect(await editComment(db, "nope", "a@x.com", "x")).toBe("not_found");
    expect(await editComment(db, "507f1f77bcf86cd799439011", "a@x.com", "x")).toBe("not_found");
  });
});
