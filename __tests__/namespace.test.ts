import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, getPromptDetailByHandleAndSlug } from "../lib/prompts";
import { createUser, ensureHandle, getUserByHandle } from "../lib/users";

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
  await db.collection("users").deleteMany({});
  await db.collection("prompts").deleteMany({});
});

describe("ensureHandle", () => {
  it("derives a handle from the email prefix", async () => {
    await createUser(db, "ada.lovelace@x.com", "secret123");
    expect(await ensureHandle(db, "ada.lovelace@x.com")).toBe("ada-lovelace");
  });
  it("is idempotent — returns the same handle on repeat", async () => {
    await createUser(db, "bob@x.com", "secret123");
    const h1 = await ensureHandle(db, "bob@x.com");
    const h2 = await ensureHandle(db, "bob@x.com");
    expect(h2).toBe(h1);
  });
  it("dedupes handles across different users", async () => {
    await createUser(db, "bob@x.com", "secret123");
    await createUser(db, "bob@y.com", "secret123");
    const h1 = await ensureHandle(db, "bob@x.com");
    const h2 = await ensureHandle(db, "bob@y.com");
    expect(h1).toBe("bob");
    expect(h2).toBe("bob-2");
  });
});

describe("getUserByHandle", () => {
  it("finds a user by handle", async () => {
    await createUser(db, "bob@x.com", "secret123", "Bob");
    await ensureHandle(db, "bob@x.com");
    const u = await getUserByHandle(db, "bob");
    expect(u?.email).toBe("bob@x.com");
  });
  it("returns null for an unknown handle", async () => {
    expect(await getUserByHandle(db, "nobody")).toBeNull();
  });
});

describe("prompt slugs", () => {
  it("assigns a slug derived from the name", async () => {
    const p = await createPrompt(db, "bob@x.com", { name: "Cold Outreach Email", description: "d", category: "c", body: "b" });
    expect(p.slug).toBe("cold-outreach-email");
  });
  it("dedupes slugs per owner", async () => {
    const a = await createPrompt(db, "bob@x.com", { name: "Same Name", description: "d", category: "c", body: "b" });
    const b = await createPrompt(db, "bob@x.com", { name: "Same Name", description: "d", category: "c", body: "b" });
    expect(a.slug).toBe("same-name");
    expect(b.slug).toBe("same-name-2");
  });
  it("lets different owners share the same slug", async () => {
    const a = await createPrompt(db, "bob@x.com", { name: "Shared", description: "d", category: "c", body: "b" });
    const b = await createPrompt(db, "alice@x.com", { name: "Shared", description: "d", category: "c", body: "b" });
    expect(a.slug).toBe("shared");
    expect(b.slug).toBe("shared");
  });
});

describe("getPromptDetailByHandleAndSlug", () => {
  beforeEach(async () => {
    await createUser(db, "bob@x.com", "secret123", "Bob");
    await ensureHandle(db, "bob@x.com");
  });
  it("resolves a prompt by owner handle + slug", async () => {
    await createPrompt(db, "bob@x.com", { name: "My Agent", description: "d", category: "Agents", body: "hello" });
    const detail = await getPromptDetailByHandleAndSlug(db, "bob", "my-agent");
    expect(detail?.name).toBe("My Agent");
    expect(detail?.handle).toBe("bob");
    expect(detail?.slug).toBe("my-agent");
    expect(detail?.files[0].content).toBe("hello");
  });
  it("returns null for an unknown handle", async () => {
    expect(await getPromptDetailByHandleAndSlug(db, "ghost", "x")).toBeNull();
  });
  it("returns null for an unknown slug", async () => {
    expect(await getPromptDetailByHandleAndSlug(db, "bob", "nope")).toBeNull();
  });
});
