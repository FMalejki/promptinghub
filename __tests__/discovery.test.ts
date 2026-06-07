import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, incrementCopyCount, listPrompts } from "../lib/prompts";

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

describe("listPrompts discovery", () => {
  it("surfaces copyCount on list items (default 0)", async () => {
    await createPrompt(db, "a@x.com", { name: "Alpha", description: "d", category: "Writing", body: "b" });
    const [p] = await listPrompts(db, { q: "Alpha" });
    expect(p.copyCount).toBe(0);
  });

  it("sorts by most copied when sort=copied", async () => {
    const a = await createPrompt(db, "a@x.com", { name: "Aaa", description: "d", category: "Writing", body: "b" });
    const b = await createPrompt(db, "a@x.com", { name: "Bbb", description: "d", category: "Writing", body: "b" });
    await incrementCopyCount(db, b.id);
    await incrementCopyCount(db, b.id);
    await incrementCopyCount(db, a.id);
    const sorted = await listPrompts(db, { sort: "copied" });
    expect(sorted.map((p) => p.name)).toEqual(["Bbb", "Aaa"]);
    expect(sorted[0].copyCount).toBe(2);
  });

  it("filters by tested model id", async () => {
    await createPrompt(db, "a@x.com", { name: "Gem", description: "d", category: "Writing", body: "b", testedModels: [{ modelId: "gemini-2.0" }] });
    await createPrompt(db, "a@x.com", { name: "Claudey", description: "d", category: "Writing", body: "b", testedModels: [{ modelId: "claude-opus-4" }] });
    const gem = await listPrompts(db, { model: "gemini-2.0" });
    expect(gem.map((p) => p.name)).toEqual(["Gem"]);
  });

  it("ranks by a trending score (copies + stars) when sort=trending", async () => {
    const a = await createPrompt(db, "a@x.com", { name: "Aaa", description: "d", category: "Writing", body: "b" });
    const b = await createPrompt(db, "a@x.com", { name: "Bbb", description: "d", category: "Writing", body: "b" });
    const c = await createPrompt(db, "a@x.com", { name: "Ccc", description: "d", category: "Writing", body: "b" });
    // a: 3 copies (score 3); b: 1 star + 1 copy (score 2); c: nothing
    await incrementCopyCount(db, a.id);
    await incrementCopyCount(db, a.id);
    await incrementCopyCount(db, a.id);
    await incrementCopyCount(db, b.id);
    await db.collection("prompts").updateOne({ name: "Bbb" }, { $set: { starredBy: ["x@x.com"] } });
    const ranked = await listPrompts(db, { sort: "trending" });
    expect(ranked.slice(0, 3).map((p) => p.name)).toEqual(["Aaa", "Bbb", "Ccc"]);
  });

  it("filters to image-gen prompts when imageOnly is set", async () => {
    await createPrompt(db, "a@x.com", { name: "Mid", description: "d", category: "Creative", body: "b", testedModels: [{ modelId: "midjourney" }] });
    await createPrompt(db, "a@x.com", { name: "Img", description: "d", category: "Image Generation", body: "b" });
    await createPrompt(db, "a@x.com", { name: "Text", description: "d", category: "Writing", body: "b", testedModels: [{ modelId: "gpt-4" }] });
    const imgs = await listPrompts(db, { imageOnly: true });
    expect(imgs.map((p) => p.name).sort()).toEqual(["Img", "Mid"]);
  });

  it("does not leak private prompts when q is combined with the privacy filter", async () => {
    // Mallory's private prompt matches the query but must stay hidden from a signed-in stranger.
    await createPrompt(db, "mallory@x.com", { name: "Secret Sauce", description: "hidden", category: "Writing", body: "b", isPrivate: true });
    await createPrompt(db, "bob@x.com", { name: "Secret Public", description: "open", category: "Writing", body: "b" });
    const visible = await listPrompts(db, { q: "Secret", includePrivate: true, userEmail: "bob@x.com" });
    expect(visible.map((p) => p.name).sort()).toEqual(["Secret Public"]);
  });
});
