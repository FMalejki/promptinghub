process.env.PROMPT_ENC_KEY = "0".repeat(64);

import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, getPromptDetail, updatePrompt } from "../lib/prompts";

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

const OWNER = "owner@x.com";
const STRANGER = "someone@y.com";

async function makeLocked() {
  return createPrompt(db, OWNER, {
    name: "Secret Sauce",
    description: "hidden",
    category: "Coding",
    files: [{ path: "system.md", content: "TOP SECRET INSTRUCTIONS" }],
    locked: true,
  });
}

describe("locked prompts", () => {
  it("stores ciphertext, not plaintext, in the DB row", async () => {
    const { id } = await makeLocked();
    const raw = await db.collection("prompts").findOne({ name: "Secret Sauce" });
    expect(raw?.locked).toBe(true);
    expect(raw?.body).toBe(""); // plaintext blanked
    expect(raw?.files ?? []).toHaveLength(0);
    expect(typeof raw?.enc).toBe("string");
    expect(JSON.stringify(raw)).not.toContain("TOP SECRET INSTRUCTIONS");
    expect(id).toBeTruthy();
  });

  it("redacts contents for a stranger but decrypts for the owner", async () => {
    const { id } = await makeLocked();

    const asStranger = await getPromptDetail(db, id, STRANGER);
    expect(asStranger?.locked).toBe(true);
    expect(asStranger?.lockedForViewer).toBe(true);
    expect(asStranger?.body).toBe("");
    expect(asStranger?.files).toHaveLength(0);

    const asAnon = await getPromptDetail(db, id, null);
    expect(asAnon?.lockedForViewer).toBe(true);

    const asOwner = await getPromptDetail(db, id, OWNER);
    expect(asOwner?.locked).toBe(true);
    expect(asOwner?.lockedForViewer).toBe(false);
    expect(asOwner?.files[0].content).toBe("TOP SECRET INSTRUCTIONS");
  });

  it("decrypts for a shared user", async () => {
    const { id } = await makeLocked();
    await db.collection("prompts").updateOne({ name: "Secret Sauce" }, { $set: { sharedWith: [STRANGER] } });
    const shared = await getPromptDetail(db, id, STRANGER);
    expect(shared?.lockedForViewer).toBe(false);
    expect(shared?.files[0].content).toBe("TOP SECRET INSTRUCTIONS");
  });

  it("locking a previously-public prompt purges plaintext version history", async () => {
    const { id } = await createPrompt(db, OWNER, {
      name: "Was Public",
      description: "d",
      category: "Coding",
      files: [{ path: "a.txt", content: "v1 content" }],
    });
    // edit once to create a version snapshot
    await updatePrompt(db, id, OWNER, { files: [{ path: "a.txt", content: "v2 content" }] }, { message: "edit" });
    expect(await db.collection("promptVersions").countDocuments({ promptId: id })).toBe(1);
    // now lock it
    await updatePrompt(db, id, OWNER, { locked: true });
    expect(await db.collection("promptVersions").countDocuments({ promptId: id })).toBe(0);
    const raw = await db.collection("prompts").findOne({ _id: (await import("mongodb")).ObjectId.createFromHexString(id) });
    expect(raw?.locked).toBe(true);
    expect(raw?.body).toBe("");
    // owner can still read the (now-encrypted) latest content
    const asOwner = await getPromptDetail(db, id, OWNER);
    expect(asOwner?.files[0].content).toBe("v2 content");
  });
});
