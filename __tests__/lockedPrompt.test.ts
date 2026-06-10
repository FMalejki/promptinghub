process.env.PROMPT_ENC_KEY = "0".repeat(64);

import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, getPromptDetail, updatePrompt, normalizeEmails, listPrompts, listSharedWithMe } from "../lib/prompts";

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

async function makeLocked(extra: Record<string, unknown> = {}) {
  return createPrompt(db, OWNER, {
    name: "Secret Sauce",
    description: "hidden",
    category: "Coding",
    files: [{ path: "system.md", content: "TOP SECRET INSTRUCTIONS" }],
    locked: true,
    ...extra,
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

  it("shares via createPrompt sharedWith (real create path, not a direct DB write)", async () => {
    const { id } = await makeLocked({ sharedWith: [`  ${STRANGER.toUpperCase()} `, STRANGER, "not-an-email"] });
    // normalized + deduped + lowercased, invalid dropped
    const raw = await db.collection("prompts").findOne({ name: "Secret Sauce" });
    expect(raw?.sharedWith).toEqual([STRANGER]);
    // the listed user decrypts; an unlisted stranger stays redacted
    expect((await getPromptDetail(db, id, STRANGER))?.files[0].content).toBe("TOP SECRET INSTRUCTIONS");
    const other = await getPromptDetail(db, id, "nobody@z.com");
    expect(other?.lockedForViewer).toBe(true);
    expect(other?.files).toHaveLength(0);
  });

  it("updatePrompt can grant then revoke share access without exposing plaintext", async () => {
    const { id } = await makeLocked();
    expect((await getPromptDetail(db, id, STRANGER))?.lockedForViewer).toBe(true);
    // grant
    await updatePrompt(db, id, OWNER, { sharedWith: [STRANGER] });
    expect((await getPromptDetail(db, id, STRANGER))?.files[0].content).toBe("TOP SECRET INSTRUCTIONS");
    // still ciphertext at rest
    const raw = await db.collection("prompts").findOne({ name: "Secret Sauce" });
    expect(raw?.body).toBe("");
    expect(JSON.stringify(raw)).not.toContain("TOP SECRET INSTRUCTIONS");
    // revoke
    await updatePrompt(db, id, OWNER, { sharedWith: [] });
    const after = await getPromptDetail(db, id, STRANGER);
    expect(after?.lockedForViewer).toBe(true);
    expect(after?.files).toHaveLength(0);
  });

  it("exposes the sharedWith allowlist to the owner only", async () => {
    const { id } = await makeLocked({ sharedWith: [STRANGER] });
    const asOwner = (await getPromptDetail(db, id, OWNER)) as { sharedWith?: string[] };
    expect(asOwner.sharedWith).toEqual([STRANGER]);
    // a shared user can read content but must NOT see the full allowlist
    const asStranger = (await getPromptDetail(db, id, STRANGER)) as { sharedWith?: string[] };
    expect(asStranger.sharedWith).toBeUndefined();
    const asAnon = (await getPromptDetail(db, id, null)) as { sharedWith?: string[] };
    expect(asAnon.sharedWith).toBeUndefined();
  });

  it("listings expose the locked flag (for the card badge) without leaking content", async () => {
    await makeLocked();
    const rows = await listPrompts(db);
    const row = rows.find((r) => r.name === "Secret Sauce");
    expect(row?.locked).toBe(true);
    expect(JSON.stringify(row)).not.toContain("TOP SECRET INSTRUCTIONS");
  });

  it("listSharedWithMe returns locked prompts shared with the viewer, as safe cards", async () => {
    // shared+locked → included
    await makeLocked({ name: "Shared One", sharedWith: [STRANGER] });
    // locked but NOT shared with STRANGER → excluded
    await makeLocked({ name: "Not Shared" });
    // shared with STRANGER but NOT locked → excluded (only locked prompts are "shared")
    await createPrompt(db, OWNER, {
      name: "Public Shared",
      description: "d",
      category: "Coding",
      body: "plain",
    });
    await db.collection("prompts").updateOne({ name: "Public Shared" }, { $set: { sharedWith: [STRANGER] } });

    const mine = await listSharedWithMe(db, STRANGER);
    expect(mine.map((p) => p.name)).toEqual(["Shared One"]);
    const card = mine[0] as Record<string, unknown>;
    expect(card.locked).toBe(true);
    // card carries no decrypted content and no allowlist
    expect(JSON.stringify(card)).not.toContain("TOP SECRET INSTRUCTIONS");
    expect(card).not.toHaveProperty("sharedWith");
    expect(card).not.toHaveProperty("body");
    expect(card).not.toHaveProperty("enc");
  });

  it("listSharedWithMe is empty for a user with nothing shared", async () => {
    await makeLocked({ sharedWith: [STRANGER] });
    expect(await listSharedWithMe(db, "nobody@z.com")).toEqual([]);
    expect(await listSharedWithMe(db, "")).toEqual([]);
  });

  it("normalizeEmails dedupes, lowercases, trims and drops invalid", () => {
    expect(normalizeEmails(["  A@B.com ", "a@b.com", "x", "c@d.io"])).toEqual(["a@b.com", "c@d.io"]);
    expect(normalizeEmails("a@b.com, c@d.io\n a@b.com")).toEqual(["a@b.com", "c@d.io"]);
    expect(normalizeEmails(undefined)).toEqual([]);
    expect(normalizeEmails("")).toEqual([]);
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
