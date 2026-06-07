import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, updatePrompt, getPromptDetail } from "../lib/prompts";
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

describe("restoreVersion", () => {
  it("restores a past version's content and snapshots the pre-restore state", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "v1" });
    await updatePrompt(db, id, "a@x.com", { body: "v2" }); // versions: [v1]
    expect(await restoreVersion(db, id, "a@x.com", 1)).toBe(true);
    expect((await getPromptDetail(db, id))?.body).toBe("v1");
    // the v2 state was snapshotted by the restore edit
    const versions = await listVersions(db, id);
    expect(versions[0].body).toBe("v2");
  });

  it("restores files from a version", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", files: [{ path: "a.md", content: "old" }] });
    await updatePrompt(db, id, "a@x.com", { files: [{ path: "a.md", content: "new" }] });
    await restoreVersion(db, id, "a@x.com", 1);
    const detail = await getPromptDetail(db, id);
    expect(detail?.files[0]).toMatchObject({ path: "a.md", content: "old" });
  });

  it("refuses a non-owner and unknown versions", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "v1" });
    await updatePrompt(db, id, "a@x.com", { body: "v2" });
    expect(await restoreVersion(db, id, "mallory@x.com", 1)).toBe(false);
    expect(await restoreVersion(db, id, "a@x.com", 99)).toBe(false);
  });
});
