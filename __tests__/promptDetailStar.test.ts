import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, getPromptDetail } from "../lib/prompts";

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
  await db.collection("prompts").deleteMany({});
});

describe("getPromptDetail isStarred (viewer-aware)", () => {
  async function makeStarredPrompt() {
    const { id } = await createPrompt(db, "owner@x.com", { name: "P", description: "d", category: "Writing", body: "b" });
    await db.collection("prompts").updateOne(
      { _id: (await db.collection("prompts").findOne({}))!._id },
      { $set: { starredBy: ["alice@x.com"] } },
    );
    return id;
  }

  it("returns isStarred=true for a viewer who starred it", async () => {
    const id = await makeStarredPrompt();
    const detail = await getPromptDetail(db, id, "alice@x.com");
    expect(detail?.isStarred).toBe(true);
    expect(detail?.stars).toBe(1);
  });

  it("returns isStarred=false for a different viewer or no viewer", async () => {
    const id = await makeStarredPrompt();
    expect((await getPromptDetail(db, id, "bob@x.com"))?.isStarred).toBe(false);
    expect((await getPromptDetail(db, id))?.isStarred).toBe(false);
    expect((await getPromptDetail(db, id, null))?.isStarred).toBe(false);
  });
});
