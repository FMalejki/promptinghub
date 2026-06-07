import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, getPromptDetail } from "../lib/prompts";
import { buildForkInput } from "../lib/fork";

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

describe("buildForkInput", () => {
  it("carries the source id as forkedFrom lineage", () => {
    const input = buildForkInput(
      { id: "src123", name: "Original", description: "d", category: "Writing", files: [{ path: "p.txt", content: "hi {{x}}" }] },
      { x: "there" },
    );
    expect(input.forkedFrom).toBe("src123");
    expect(input.name).toBe("Original (fork)");
    expect(input.files?.[0].content).toBe("hi there");
  });
});

describe("fork lineage in createPrompt / getPromptDetail", () => {
  it("records a valid source and surfaces it as forkedFrom on the fork", async () => {
    const src = await createPrompt(db, "a@x.com", { name: "Source", description: "d", category: "Writing", body: "orig" });
    const fork = await createPrompt(db, "b@x.com", { name: "Source (fork)", description: "d", category: "Writing", body: "orig", forkedFrom: src.id });

    const forkDetail = await getPromptDetail(db, fork.id);
    expect(forkDetail?.forkedFrom).toEqual({ id: src.id, name: "Source" });
    expect(forkDetail?.forkCount).toBe(0);
  });

  it("counts forks on the source prompt", async () => {
    const src = await createPrompt(db, "a@x.com", { name: "Source", description: "d", category: "Writing", body: "orig" });
    await createPrompt(db, "b@x.com", { name: "f1", description: "d", category: "Writing", body: "o", forkedFrom: src.id });
    await createPrompt(db, "c@x.com", { name: "f2", description: "d", category: "Writing", body: "o", forkedFrom: src.id });

    const srcDetail = await getPromptDetail(db, src.id);
    expect(srcDetail?.forkCount).toBe(2);
    expect(srcDetail?.forkedFrom).toBeNull();
  });

  it("ignores a forkedFrom pointing at a missing/invalid prompt", async () => {
    const a = await createPrompt(db, "a@x.com", { name: "A", description: "d", category: "Writing", body: "x", forkedFrom: "507f1f77bcf86cd799439011" });
    const b = await createPrompt(db, "a@x.com", { name: "B", description: "d", category: "Writing", body: "x", forkedFrom: "not-an-id" });
    expect((await getPromptDetail(db, a.id))?.forkedFrom).toBeNull();
    expect((await getPromptDetail(db, b.id))?.forkedFrom).toBeNull();
  });
});
