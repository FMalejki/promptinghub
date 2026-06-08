import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, getPrompt, getPromptDetail, updatePrompt, deletePrompt } from "../lib/prompts";

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

describe("updatePrompt", () => {
  it("updates the owner's prompt fields", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "Old", description: "d", category: "Writing", body: "b" });
    const ok = await updatePrompt(db, id, "alice@x.com", { name: "New", category: "Coding" });
    expect(ok).toBe(true);
    const row = await getPrompt(db, id);
    expect(row?.name).toBe("New");
    expect(row?.category).toBe("Coding");
  });

  it("recomputes files + body when files are edited", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "P", description: "d", category: "c", body: "orig" });
    await updatePrompt(db, id, "alice@x.com", {
      files: [
        { path: "a.md", content: "one" },
        { path: "b.md", content: "two" },
      ],
    });
    const detail = await getPromptDetail(db, id);
    expect(detail?.files.map((f) => f.path)).toEqual(["a.md", "b.md"]);
    expect(detail?.body).toBe("one\n\ntwo");
  });

  it("refuses to update a prompt owned by someone else", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "Old", description: "d", category: "c", body: "b" });
    const ok = await updatePrompt(db, id, "mallory@x.com", { name: "Hacked" });
    expect(ok).toBe(false);
    expect((await getPrompt(db, id))?.name).toBe("Old");
  });

  it("returns false for a malformed id", async () => {
    expect(await updatePrompt(db, "nope", "alice@x.com", { name: "x" })).toBe(false);
  });

  it("keeps the slug stable across edits", async () => {
    const { slug } = await createPrompt(db, "alice@x.com", { name: "Stable Name", description: "d", category: "c", body: "b" });
    const before = await db.collection("prompts").findOne({});
    await updatePrompt(db, before!._id.toString(), "alice@x.com", { name: "Totally Different" });
    const after = await db.collection("prompts").findOne({});
    expect(after?.slug).toBe(slug);
  });
});

describe("deletePrompt", () => {
  it("deletes the owner's prompt", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "P", description: "d", category: "c", body: "b" });
    expect(await deletePrompt(db, id, "alice@x.com")).toBe(true);
    expect(await getPrompt(db, id)).toBeNull();
  });

  it("refuses to delete a prompt owned by someone else", async () => {
    const { id } = await createPrompt(db, "alice@x.com", { name: "P", description: "d", category: "c", body: "b" });
    expect(await deletePrompt(db, id, "mallory@x.com")).toBe(false);
    expect(await getPrompt(db, id)).not.toBeNull();
  });
});
