import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, updatePrompt } from "../lib/prompts";
import { listVersions, restoreVersion } from "../lib/versions";

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

describe("prompt versioning", () => {
  it("has no versions before any edit", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "v1" });
    expect(await listVersions(db, id)).toEqual([]);
  });

  it("snapshots the PRIOR content on each edit, newest-first", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "v1" });
    await updatePrompt(db, id, "a@x.com", { body: "v2" });
    await updatePrompt(db, id, "a@x.com", { body: "v3" });
    const versions = await listVersions(db, id);
    expect(versions).toHaveLength(2);
    // newest snapshot first: the prior state before the v3 edit was "v2"
    expect(versions[0].body).toBe("v2");
    expect(versions[1].body).toBe("v1");
    expect(versions[0].version).toBe(2);
    expect(versions[1].version).toBe(1);
  });

  it("does not snapshot when a non-owner attempts an edit", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "v1" });
    await updatePrompt(db, id, "mallory@x.com", { body: "hacked" });
    expect(await listVersions(db, id)).toEqual([]);
  });

  it("captures files in a snapshot", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", files: [{ path: "a.md", content: "old" }] });
    await updatePrompt(db, id, "a@x.com", { files: [{ path: "a.md", content: "new" }] });
    const [v] = await listVersions(db, id);
    expect(v.files?.[0]).toMatchObject({ path: "a.md", content: "old" });
  });
});

describe("commit messages on versions", () => {
  it("stores the change message ('commit') and returns it newest-first", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "v1" });
    await updatePrompt(db, id, "a@x.com", { body: "v2" }, { message: "tighten wording" });
    const [v] = await listVersions(db, id);
    expect(v.message).toBe("tighten wording");
  });

  it("defaults the message to an empty string when none is given", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "v1" });
    await updatePrompt(db, id, "a@x.com", { body: "v2" });
    const [v] = await listVersions(db, id);
    expect(v.message).toBe("");
  });

  it("trims and caps the message at 200 chars", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "v1" });
    await updatePrompt(db, id, "a@x.com", { body: "v2" }, { message: "  " + "x".repeat(250) + "  " });
    const [v] = await listVersions(db, id);
    expect(v.message).toHaveLength(200);
  });

  it("labels a restore as its own commit", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "v1" });
    await updatePrompt(db, id, "a@x.com", { body: "v2" });
    await restoreVersion(db, id, "a@x.com", 1);
    const versions = await listVersions(db, id);
    expect(versions[0].message).toMatch(/Restored v1/);
  });
});
