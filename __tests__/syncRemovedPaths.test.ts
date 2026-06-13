import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, updatePrompt, getPromptDetail, filterSyncedFiles } from "../lib/prompts";

// A GitHub-linked prompt must not resurrect files the owner manually deleted:
// editor saves leave a tombstone (removedPaths), and sync filters those out.
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
  await db.collection("promptVersions").deleteMany({});
});

async function seed(): Promise<string> {
  const p = await createPrompt(db, "owner@x.com", {
    name: "Repo prompt",
    description: "d",
    category: "Coding",
    files: [
      { path: "a.md", content: "A" },
      { path: "b.md", content: "B" },
      { path: "c.md", content: "C" },
    ],
  } as any);
  return p.id;
}

describe("removedPaths tombstones (updatePrompt with trackRemovals)", () => {
  it("records a path the owner deletes in the editor", async () => {
    const id = await seed();
    await updatePrompt(db, id, "owner@x.com", { files: [{ path: "a.md", content: "A" }, { path: "c.md", content: "C" }] } as any, { trackRemovals: true });
    const row = await db.collection("prompts").findOne({});
    expect(row!.removedPaths).toEqual(["b.md"]);
  });

  it("clears the tombstone when the owner re-adds the same path", async () => {
    const id = await seed();
    await updatePrompt(db, id, "owner@x.com", { files: [{ path: "a.md", content: "A" }] } as any, { trackRemovals: true });
    let row = await db.collection("prompts").findOne({});
    expect(new Set(row!.removedPaths)).toEqual(new Set(["b.md", "c.md"]));
    await updatePrompt(db, id, "owner@x.com", { files: [{ path: "a.md", content: "A" }, { path: "b.md", content: "B" }] } as any, { trackRemovals: true });
    row = await db.collection("prompts").findOne({});
    expect(row!.removedPaths).toEqual(["c.md"]); // b re-added → cleared; c stays removed
  });

  it("does NOT touch removedPaths when trackRemovals is off (the sync path)", async () => {
    const id = await seed();
    await updatePrompt(db, id, "owner@x.com", { files: [{ path: "a.md", content: "A" }] } as any, { trackRemovals: true });
    // Sync-style write of a pre-filtered set must not clear the tombstones.
    await updatePrompt(db, id, "owner@x.com", { files: [{ path: "a.md", content: "A2" }] } as any, {});
    const row = await db.collection("prompts").findOne({});
    expect(new Set(row!.removedPaths)).toEqual(new Set(["b.md", "c.md"]));
  });
});

describe("filterSyncedFiles", () => {
  it("drops repo files whose path is tombstoned", () => {
    const files = [
      { path: "a.md", content: "A" },
      { path: "b.md", content: "B" },
      { path: "c.md", content: "C" },
    ];
    expect(filterSyncedFiles(files, ["b.md"]).map((f) => f.path)).toEqual(["a.md", "c.md"]);
  });
  it("returns everything when there are no tombstones", () => {
    const files = [{ path: "a.md", content: "A" }];
    expect(filterSyncedFiles(files, []).map((f) => f.path)).toEqual(["a.md"]);
    expect(filterSyncedFiles(files, undefined).map((f) => f.path)).toEqual(["a.md"]);
  });
});
