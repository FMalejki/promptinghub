import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser } from "../lib/users";
import { createPrompt } from "../lib/prompts";
import { searchTags } from "../lib/prompts";

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
  await db.collection("users").deleteMany({});
  await createUser(db, "a@x.com", "pw", "A");
  const mk = (name: string, tags: string[], isPrivate = false) =>
    createPrompt(db, "a@x.com", { name, description: "d", category: "Writing", tags, isPrivate, files: [{ path: "f", content: "x" }] } as any);
  await mk("p1", ["seo", "marketing"]);
  await mk("p2", ["seo", "coding"]);
  await mk("p3", ["search", "seo-tools"]);
  await mk("p4", ["secret-tag"], true); // private — excluded
});

describe("searchTags", () => {
  it("matches a substring, ranked by usage then alphabetically", async () => {
    const res = await searchTags(db, "se");
    // "seo" (2 uses) before "search"/"seo-tools" (1 each, alpha)
    expect(res.map((r) => r.tag)).toEqual(["seo", "search", "seo-tools"]);
    expect(res[0]).toEqual({ tag: "seo", count: 2 });
  });

  it("is case-insensitive and trims the query", async () => {
    expect((await searchTags(db, "  SEO ")).map((r) => r.tag)).toContain("seo");
  });

  it("excludes tags only used by private prompts", async () => {
    expect((await searchTags(db, "secret")).map((r) => r.tag)).toEqual([]);
  });

  it("returns [] for an empty query", async () => {
    expect(await searchTags(db, "   ")).toEqual([]);
  });

  it("respects the limit", async () => {
    expect((await searchTags(db, "s", 1)).length).toBe(1);
  });
});
