import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt } from "../lib/prompts";
import { createCollection, addPromptToCollection, getCollectionExport } from "../lib/collections";

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
  await db.collection("collections").deleteMany({});
  await db.collection("prompts").deleteMany({});
});

describe("getCollectionExport", () => {
  it("bundles the collection name + each prompt's files in order", async () => {
    const { id } = await createCollection(db, "a@x.com", { name: "My Bundle", description: "stuff" });
    const p1 = await createPrompt(db, "a@x.com", { name: "One", description: "d", category: "Writing", files: [{ path: "a.md", content: "aaa" }] });
    const p2 = await createPrompt(db, "a@x.com", { name: "Two", description: "d", category: "Coding", body: "bbb" });
    await addPromptToCollection(db, id, "a@x.com", p2.id);
    await addPromptToCollection(db, id, "a@x.com", p1.id);

    const exp = await getCollectionExport(db, id);
    expect(exp?.name).toBe("My Bundle");
    expect(exp?.description).toBe("stuff");
    expect(exp?.prompts.map((p) => p.name)).toEqual(["Two", "One"]);
    expect(exp?.prompts[0].files).toEqual([{ path: "prompt.txt", content: "bbb" }]);
    expect(exp?.prompts[1].files).toEqual([{ path: "a.md", content: "aaa" }]);
  });

  it("returns null for a malformed/missing collection", async () => {
    expect(await getCollectionExport(db, "nope")).toBeNull();
  });
});
