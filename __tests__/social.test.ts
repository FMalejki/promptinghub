import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, listPrompts, toggleStar, getFavorites, sharePrompt } from "../lib/prompts";

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
  await db.collection("users").insertMany([
    { email: "alice@x.com", name: "Alice", image: null },
    { email: "bob@x.com", name: "Bob", image: null },
  ]);
});

describe("toggleStar + favorites", () => {
  it("stars a prompt, increments its star count, and adds it to favorites", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "P", description: "d", category: "c", body: "b" });
    const starred = await toggleStar(db, id, "bob@x.com");
    expect(starred).toBe(true);
    const row = (await listPrompts(db)).find((r) => r.id === id)!;
    expect(row.stars).toBe(1);
    expect(await getFavorites(db, "bob@x.com")).toContain(id);
  });

  it("un-stars on a second toggle and removes from favorites", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "P", description: "d", category: "c", body: "b" });
    await toggleStar(db, id, "bob@x.com");
    const second = await toggleStar(db, id, "bob@x.com");
    expect(second).toBe(false);
    const row = (await listPrompts(db)).find((r) => r.id === id)!;
    expect(row.stars).toBe(0);
    expect(await getFavorites(db, "bob@x.com")).not.toContain(id);
  });

  it("returns false for a non-existent prompt", async () => {
    expect(await toggleStar(db, "507f1f77bcf86cd799439011", "bob@x.com")).toBe(false);
  });
});

describe("sharePrompt", () => {
  it("lets the owner share a prompt with another user", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "P", description: "d", category: "c", body: "b", isPrivate: true });
    expect(await sharePrompt(db, id, "alice@x.com", "bob@x.com")).toBe(true);
  });
  it("refuses to share when the requester is not the owner", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "P", description: "d", category: "c", body: "b" });
    expect(await sharePrompt(db, id, "bob@x.com", "eve@x.com")).toBe(false);
  });
});

describe("listPrompts privacy", () => {
  it("hides private prompts from the public list", async () => {
    await createPrompt(db, "alice@x.com", { name: "Public", description: "d", category: "c", body: "b" });
    await createPrompt(db, "alice@x.com", { name: "Secret", description: "d", category: "c", body: "b", isPrivate: true });
    const names = (await listPrompts(db)).map((r) => r.name);
    expect(names).toContain("Public");
    expect(names).not.toContain("Secret");
  });

  it("shows a user their own private prompts when includePrivate is set", async () => {
    await createPrompt(db, "alice@x.com", { name: "Secret", description: "d", category: "c", body: "b", isPrivate: true });
    const names = (await listPrompts(db, { includePrivate: true, userEmail: "alice@x.com" })).map((r) => r.name);
    expect(names).toContain("Secret");
  });

  it("shows a private prompt to a user it was shared with", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "Shared secret", description: "d", category: "c", body: "b", isPrivate: true });
    await sharePrompt(db, id, "alice@x.com", "bob@x.com");
    const names = (await listPrompts(db, { includePrivate: true, userEmail: "bob@x.com" })).map((r) => r.name);
    expect(names).toContain("Shared secret");
  });
});

describe("listPrompts sort", () => {
  it("orders by stars when sort=popular", async () => {
    const a = await createPrompt(db, "alice@x.com", { name: "Few", description: "d", category: "c", body: "b" });
    const popular = await createPrompt(db, "alice@x.com", { name: "Many", description: "d", category: "c", body: "b" });
    await toggleStar(db, popular.id, "alice@x.com");
    await toggleStar(db, popular.id, "bob@x.com");
    const rows = await listPrompts(db, { sort: "popular" });
    expect(rows[0].name).toBe("Many");
  });
});
