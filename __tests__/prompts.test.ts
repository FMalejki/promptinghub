import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { listPrompts, getPrompt, getPromptDetail, listCategories, createPrompt, languageFromPath, normalizeFiles } from "../lib/prompts";

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
    { email: "alice@x.com", name: "Alice", image: "http://img/a.png" },
    { email: "bob@x.com", name: "Bob", image: null },
  ]);
  await db.collection("prompts").insertMany([
    { ownerEmail: "alice@x.com", name: "Summarize", description: "Summarize any text", category: "Writing", body: "b1", createdAt: new Date("2026-01-01") },
    { ownerEmail: "bob@x.com", name: "Code review", description: "Review code for bugs", category: "Coding", body: "b2", createdAt: new Date("2026-01-02") },
    { ownerEmail: "alice@x.com", name: "Polish translator", description: "Translate to Polish", category: "Writing", body: "b3", createdAt: new Date("2026-01-03") },
  ]);
});

describe("listPrompts (public pool)", () => {
  it("returns prompts from all users", async () => {
    const rows = await listPrompts(db);
    expect(rows).toHaveLength(3);
  });

  it("returns newest first", async () => {
    const rows = await listPrompts(db);
    expect(rows.map((r) => r.name)).toEqual(["Polish translator", "Code review", "Summarize"]);
  });

  it("attaches author profile", async () => {
    const rows = await listPrompts(db);
    const summarize = rows.find((r) => r.name === "Summarize")!;
    expect(summarize.author).toEqual({ name: "Alice", image: "http://img/a.png", handle: null });
  });

  it("falls back to email-derived author when no user row exists", async () => {
    await createPrompt(db, "ghost@x.com", { name: "Orphan", description: "d", category: "Misc", body: "x" });
    const rows = await listPrompts(db);
    const orphan = rows.find((r) => r.name === "Orphan")!;
    expect(orphan.author.handle).toBeNull();
    expect(orphan.author.name).toBe("ghost");
  });

  it("filters by query on name/description", async () => {
    const rows = await listPrompts(db, { q: "code" });
    expect(rows.map((r) => r.name)).toEqual(["Code review"]);
  });

  it("filters by category", async () => {
    const rows = await listPrompts(db, { category: "Writing" });
    expect(rows.map((r) => r.name).sort()).toEqual(["Polish translator", "Summarize"]);
  });

  it("returns the whole pool when no limit is given (backward compatible)", async () => {
    expect(await listPrompts(db)).toHaveLength(3);
  });

  it("applies a limit (newest-first page)", async () => {
    const rows = await listPrompts(db, { limit: 2 });
    expect(rows.map((r) => r.name)).toEqual(["Polish translator", "Code review"]);
  });

  it("applies skip + limit for the next page", async () => {
    const rows = await listPrompts(db, { limit: 2, skip: 2 });
    expect(rows.map((r) => r.name)).toEqual(["Summarize"]);
  });

  it("skip past the end yields an empty page", async () => {
    expect(await listPrompts(db, { skip: 99 })).toEqual([]);
  });
});

describe("listCategories (global)", () => {
  it("returns all distinct categories sorted", async () => {
    expect(await listCategories(db)).toEqual(["Coding", "Writing"]);
  });
});

describe("createPrompt", () => {
  it("inserts a prompt owned by the author and returns it", async () => {
    const created = await createPrompt(db, "alice@x.com", { name: "New one", description: "d", category: "Coding", body: "body" });
    expect(created).toEqual(expect.objectContaining({ id: expect.any(String), name: "New one", category: "Coding" }));
    const found = await getPrompt(db, created.id);
    expect(found?.body).toBe("body");
    expect(found?.ownerEmail).toBe("alice@x.com");
  });

  it("makes the prompt visible in the public list", async () => {
    await createPrompt(db, "bob@x.com", { name: "Visible", description: "d", category: "Fun", body: "x" });
    expect((await listPrompts(db)).some((r) => r.name === "Visible")).toBe(true);
  });
});

describe("getPrompt", () => {
  it("returns any prompt by id with body (no owner scoping)", async () => {
    const [p] = await listPrompts(db);
    const found = await getPrompt(db, p.id);
    expect(found?.name).toBe(p.name);
  });

  it("returns null for unknown id", async () => {
    expect(await getPrompt(db, "507f1f77bcf86cd799439011")).toBeNull();
  });

  it("returns null for malformed id", async () => {
    expect(await getPrompt(db, "not-a-valid-id")).toBeNull();
  });
});

describe("getPromptDetail", () => {
  it("returns the prompt with body, files and resolved author profile", async () => {
    const [summarize] = (await listPrompts(db, { q: "Summarize" }));
    const detail = await getPromptDetail(db, summarize.id);
    expect(detail).toEqual({
      id: summarize.id,
      name: "Summarize",
      description: "Summarize any text",
      category: "Writing",
      body: "b1",
      files: [{ path: "prompt.txt", content: "b1", language: "text" }],
      author: { name: "Alice", image: "http://img/a.png", handle: null },
      image: null,
      stars: 0,
      isPrivate: false,
      testedModels: [],
      copyCount: 0,
      viewCount: 0,
      priceCents: 0,
      tags: [],
      forkedFrom: null,
      forkCount: 0,
      createdAt: new Date("2026-01-01"),
      updatedAt: null,
      isStarred: false,
      isOwner: false,
    });
  });

  it("sets isOwner true only for the owner and never exposes author.email", async () => {
    const created = await createPrompt(db, "owner@x.com", { name: "Mine", description: "d", category: "Misc", body: "x" });
    const asowner = await getPromptDetail(db, created.id, "owner@x.com");
    const asother = await getPromptDetail(db, created.id, "someone@x.com");
    expect(asowner?.isOwner).toBe(true);
    expect(asother?.isOwner).toBe(false);
    expect(asowner?.author).not.toHaveProperty("email");
  });

  it("falls back to email-derived author when no user row exists", async () => {
    const { id } = await createPrompt(db, "ghost@x.com", { name: "Orphan", description: "d", category: "Misc", body: "x" });
    const detail = await getPromptDetail(db, id);
    expect(detail?.author).toEqual({ name: "ghost", image: null, handle: null });
  });

  it("returns null for unknown id", async () => {
    expect(await getPromptDetail(db, "507f1f77bcf86cd799439011")).toBeNull();
  });

  it("returns null for malformed id", async () => {
    expect(await getPromptDetail(db, "nope")).toBeNull();
  });
});

describe("languageFromPath", () => {
  it("maps known extensions to a language label", () => {
    expect(languageFromPath("agent.ts")).toBe("typescript");
    expect(languageFromPath("config.yaml")).toBe("yaml");
    expect(languageFromPath("main.py")).toBe("python");
    expect(languageFromPath("data.json")).toBe("json");
    expect(languageFromPath("README.md")).toBe("markdown");
    expect(languageFromPath("notes.txt")).toBe("text");
  });
  it("is case-insensitive and falls back to text for unknown/no extension", () => {
    expect(languageFromPath("Setup.PY")).toBe("python");
    expect(languageFromPath("Dockerfile")).toBe("text");
    expect(languageFromPath("weird.xyz")).toBe("text");
  });
});

describe("normalizeFiles", () => {
  it("returns stored files, inferring missing languages from the path", () => {
    expect(normalizeFiles({ files: [{ path: "a.py", content: "x", language: "" }] })).toEqual([
      { path: "a.py", content: "x", language: "python" },
    ]);
  });
  it("synthesizes a single prompt.txt file from a legacy body", () => {
    expect(normalizeFiles({ body: "hello" })).toEqual([{ path: "prompt.txt", content: "hello", language: "text" }]);
  });
});

describe("multi-file prompts", () => {
  it("stores files and returns them via getPromptDetail with inferred languages", async () => {
    const { id } = await createPrompt(db, "alice@x.com", {
      name: "Night-shift agent",
      description: "An autonomous agent package",
      category: "Agents",
      files: [
        { path: "prompt.md", content: "# System\nYou are an agent.", language: "" },
        { path: "config.yaml", content: "model: claude", language: "" },
      ],
    });
    const detail = await getPromptDetail(db, id);
    expect(detail?.files).toEqual([
      { path: "prompt.md", content: "# System\nYou are an agent.", language: "markdown" },
      { path: "config.yaml", content: "model: claude", language: "yaml" },
    ]);
  });

  it("derives a concatenated body from the files for back-compat", async () => {
    const { id } = await createPrompt(db, "bob@x.com", {
      name: "Two parter",
      description: "d",
      category: "Misc",
      files: [
        { path: "a.txt", content: "first", language: "text" },
        { path: "b.txt", content: "second", language: "text" },
      ],
    });
    const detail = await getPromptDetail(db, id);
    expect(detail?.body).toBe("first\n\nsecond");
  });

  it("still accepts a legacy single body and exposes it as one file", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "Legacy", description: "d", category: "Misc", body: "just text" });
    const detail = await getPromptDetail(db, id);
    expect(detail?.files).toEqual([{ path: "prompt.txt", content: "just text", language: "text" }]);
  });
});
