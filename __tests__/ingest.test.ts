import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { runIngest } from "../lib/ingest";
import type { PromptSource, SourceResult } from "../lib/sources/twitter";

function fakeSource(result: SourceResult): PromptSource {
  return { id: "fake", label: "Fake", fetchRecent: async () => result };
}

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
  await db.collection("ingestedDrafts").deleteMany({});
});

describe("runIngest", () => {
  it("skips cleanly when the source is disabled", async () => {
    const res = await runIngest(db, fakeSource({ enabled: false, items: [], reason: "no token" }), "ai");
    expect(res).toEqual({ enabled: false, imported: 0 });
    expect(await db.collection("ingestedDrafts").countDocuments()).toBe(0);
  });

  it("stores new drafts with pending status", async () => {
    const source = fakeSource({
      enabled: true,
      items: [
        { name: "A", description: "da", category: "Other", body: "first prompt", source: "fake" },
        { name: "B", description: "db", category: "Other", body: "second prompt", source: "fake" },
      ],
    });
    const res = await runIngest(db, source, "ai");
    expect(res).toEqual({ enabled: true, imported: 2 });
    const docs = await db.collection("ingestedDrafts").find({}).toArray();
    expect(docs.every((d) => d.status === "pending")).toBe(true);
  });

  it("does not import a draft whose body was already ingested", async () => {
    const source = fakeSource({
      enabled: true,
      items: [{ name: "A", description: "d", category: "Other", body: "same body", source: "fake" }],
    });
    expect((await runIngest(db, source, "ai")).imported).toBe(1);
    expect((await runIngest(db, source, "ai")).imported).toBe(0); // deduped
    expect(await db.collection("ingestedDrafts").countDocuments()).toBe(1);
  });
});
