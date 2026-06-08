import { MongoClient, Db, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { trendingTags } from "../lib/prompts";

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

const NOW = new Date("2026-06-07T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000);

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
  await db.collection("copyEvents").deleteMany({});
});

async function seedPrompt(tags: string[], opts: { private?: boolean } = {}) {
  const _id = new ObjectId();
  await db.collection("prompts").insertOne({ _id, tags, isPrivate: !!opts.private, name: "P" });
  return _id.toString();
}
async function copy(id: string, when: Date) {
  await db.collection("copyEvents").insertOne({ promptId: id, createdAt: when });
}

describe("trendingTags", () => {
  it("ranks tags by recent copy activity within the window", async () => {
    const seo = await seedPrompt(["seo", "writing"]);
    const code = await seedPrompt(["code"]);
    await copy(seo, daysAgo(1));
    await copy(seo, daysAgo(2));
    await copy(code, daysAgo(1));

    const trending = await trendingTags(db, { days: 7, now: NOW });
    const map = Object.fromEntries(trending.map((t) => [t.tag, t.score]));
    expect(map.seo).toBe(2);
    expect(map.writing).toBe(2);
    expect(map.code).toBe(1);
    // seo/writing tie at 2 should outrank code
    expect(trending[trending.length - 1].tag).toBe("code");
  });

  it("ignores copies outside the window", async () => {
    const old = await seedPrompt(["legacy"]);
    await copy(old, daysAgo(30));
    const trending = await trendingTags(db, { days: 7, now: NOW });
    expect(trending.find((t) => t.tag === "legacy")).toBeUndefined();
  });

  it("excludes private prompts", async () => {
    const secret = await seedPrompt(["hidden"], { private: true });
    await copy(secret, daysAgo(1));
    const trending = await trendingTags(db, { days: 7, now: NOW });
    expect(trending.find((t) => t.tag === "hidden")).toBeUndefined();
  });

  it("respects the limit and returns an empty list when there is no activity", async () => {
    expect(await trendingTags(db, { days: 7, now: NOW })).toEqual([]);
    const a = await seedPrompt(["a"]);
    const b = await seedPrompt(["b"]);
    await copy(a, daysAgo(1));
    await copy(b, daysAgo(1));
    const trending = await trendingTags(db, { days: 7, now: NOW, limit: 1 });
    expect(trending).toHaveLength(1);
  });
});
