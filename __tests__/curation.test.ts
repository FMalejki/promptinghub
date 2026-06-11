import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { runIngest } from "../lib/ingest";
import { listPendingDrafts, approveDraft, dismissDraft } from "../lib/ingest";
import { getPromptDetail } from "../lib/prompts";
import { isVerifiedEmail } from "../lib/users";
import type { PromptSource, SourceResult } from "../lib/sources/twitter";

function fakeSource(result: SourceResult): PromptSource {
  return { id: "fake", label: "Fake", fetchRecent: async () => result };
}

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
  await db.collection("ingestedDrafts").deleteMany({});
  await db.collection("prompts").deleteMany({});
  await db.collection("users").deleteMany({});
});

async function seedDraft(body = "a draft prompt") {
  await runIngest(db, fakeSource({ enabled: true, items: [{ name: "Draft", description: "d", category: "Other", body, source: "fake" }] }), "q");
  const [d] = await listPendingDrafts(db);
  return d;
}

describe("draft curation", () => {
  it("lists pending drafts", async () => {
    await seedDraft();
    const pending = await listPendingDrafts(db);
    expect(pending).toHaveLength(1);
    expect(pending[0].name).toBe("Draft");
    expect(pending[0].id).toBeTruthy();
  });

  it("approves a draft into a published prompt owned by the curator", async () => {
    const d = await seedDraft("approve me");
    const res = await approveDraft(db, d.id, "curator@x.com");
    expect(res?.promptId).toBeTruthy();
    const detail = await getPromptDetail(db, res!.promptId);
    expect(detail?.body).toBe("approve me");
    expect(detail?.author.name).toBe("curator");
    // no longer pending
    expect(await listPendingDrafts(db)).toHaveLength(0);
  });

  it("won't approve the same draft twice", async () => {
    const d = await seedDraft();
    await approveDraft(db, d.id, "curator@x.com");
    expect(await approveDraft(db, d.id, "curator@x.com")).toBeNull();
  });

  it("dismisses a draft so it leaves the pending list", async () => {
    const d = await seedDraft();
    expect(await dismissDraft(db, d.id)).toBe(true);
    expect(await listPendingDrafts(db)).toHaveLength(0);
  });
});

describe("isVerifiedEmail", () => {
  it("is true only when the user's handle is verified", async () => {
    await db.collection("users").insertOne({ email: "f@x.com", name: "Filip", handle: "filipmalejki" });
    await db.collection("users").insertOne({ email: "r@x.com", name: "Rando", handle: "rando" });
    expect(await isVerifiedEmail(db, "f@x.com")).toBe(true);
    expect(await isVerifiedEmail(db, "r@x.com")).toBe(false);
    expect(await isVerifiedEmail(db, "missing@x.com")).toBe(false);
  });
});
