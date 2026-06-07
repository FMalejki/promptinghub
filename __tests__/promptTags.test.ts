import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, updatePrompt, getPromptDetail, listPrompts } from "../lib/prompts";

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

describe("prompt tags", () => {
  it("stores normalized tags on create and returns them via getPromptDetail", async () => {
    const { id } = await createPrompt(db, "a@x.com", {
      name: "P", description: "d", category: "Writing", body: "x",
      tags: "Cold Email, SEO , cold email",
    });
    const detail = await getPromptDetail(db, id);
    expect(detail?.tags).toEqual(["cold-email", "seo"]);
  });

  it("defaults to an empty tag list", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    const detail = await getPromptDetail(db, id);
    expect(detail?.tags).toEqual([]);
  });

  it("updates tags (normalized) and surfaces them in listPrompts", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    await updatePrompt(db, id, "a@x.com", { tags: ["Marketing", "marketing", "B2B"] });
    const [row] = await listPrompts(db, {});
    expect(row.tags).toEqual(["marketing", "b2b"]);
  });

  it("filters by a single tag", async () => {
    await createPrompt(db, "a@x.com", { name: "Has", description: "d", category: "Writing", body: "x", tags: ["seo", "email"] });
    await createPrompt(db, "a@x.com", { name: "Other", description: "d", category: "Writing", body: "x", tags: ["coding"] });
    const rows = await listPrompts(db, { tag: "SEO" });
    expect(rows.map((r) => r.name)).toEqual(["Has"]);
  });
});
