import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, getPromptDetail, incrementCopyCount } from "../lib/prompts";

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

describe("incrementCopyCount", () => {
  it("starts a fresh prompt at copyCount 0", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "c", body: "b" });
    const detail = await getPromptDetail(db, id);
    expect(detail?.copyCount).toBe(0);
  });

  it("increments and returns the new count", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "c", body: "b" });
    expect(await incrementCopyCount(db, id)).toBe(1);
    expect(await incrementCopyCount(db, id)).toBe(2);
    const detail = await getPromptDetail(db, id);
    expect(detail?.copyCount).toBe(2);
  });

  it("returns null for a malformed id", async () => {
    expect(await incrementCopyCount(db, "nope")).toBeNull();
  });

  it("returns null for a missing prompt", async () => {
    expect(await incrementCopyCount(db, "0123456789abcdef01234567")).toBeNull();
  });
});

describe("incrementCopyCount — idempotency per viewer", () => {
  it("counts a viewer's repeated copies within the window only once", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "c", body: "b" });
    const viewer = "abcdef0123456789";
    expect(await incrementCopyCount(db, id, { viewer, nowMs: 1000 })).toBe(1);
    expect(await incrementCopyCount(db, id, { viewer, nowMs: 2000 })).toBe(1); // same window → no inc
    expect(await incrementCopyCount(db, id, { viewer, nowMs: 3000 })).toBe(1);
    const detail = await getPromptDetail(db, id);
    expect(detail?.copyCount).toBe(1);
  });

  it("counts different viewers separately", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "c", body: "b" });
    expect(await incrementCopyCount(db, id, { viewer: "aaaaaaaaaaaaaaaa", nowMs: 1000 })).toBe(1);
    expect(await incrementCopyCount(db, id, { viewer: "bbbbbbbbbbbbbbbb", nowMs: 1000 })).toBe(2);
  });

  it("counts the same viewer again in a later window", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "c", body: "b" });
    const viewer = "cccccccccccccccc";
    const later = 7 * 60 * 60 * 1000; // > 6h window
    expect(await incrementCopyCount(db, id, { viewer, nowMs: 1000 })).toBe(1);
    expect(await incrementCopyCount(db, id, { viewer, nowMs: later })).toBe(2);
  });

  it("records a deduped copy in the copyEvents ledger (so timeseries still sees it)", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "c", body: "b" });
    await incrementCopyCount(db, id, { viewer: "dddddddddddddddd", nowMs: 1000 });
    expect(await db.collection("copyEvents").countDocuments({ promptId: id })).toBe(1);
  });
});
