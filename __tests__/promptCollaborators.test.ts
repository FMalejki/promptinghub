import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createPrompt, updatePrompt, getPrompt, getPromptDetail, listSharedWithMe } from "../lib/prompts";

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

const OWNER = "owner@x.com";
const COLLAB = "collab@x.com";
const VIEWER = "viewer@x.com";
const STRANGER = "stranger@x.com";

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

async function makePrompt(extra: Record<string, unknown> = {}) {
  const created = await createPrompt(db, OWNER, {
    name: "Shared work",
    description: "d",
    category: "Misc",
    body: "original",
    isPrivate: true,
    sharedWith: [VIEWER],
    collaborators: [COLLAB],
    ...extra,
  });
  return created.id;
}

describe("collaborator edit access", () => {
  it("stores normalized collaborators on create", async () => {
    const id = await makePrompt({ collaborators: ["  Collab@X.com " ] });
    const row = await getPrompt(db, id);
    expect(row?.collaborators).toEqual([COLLAB]);
  });

  it("lets a collaborator edit content fields", async () => {
    const id = await makePrompt();
    const ok = await updatePrompt(db, id, COLLAB, { name: "Edited by collab", body: "new body" });
    expect(ok).toBe(true);
    const row = await getPrompt(db, id);
    expect(row?.name).toBe("Edited by collab");
    expect(row?.body).toBe("new body");
  });

  it("ignores owner-only fields when a collaborator edits (no privilege escalation)", async () => {
    const id = await makePrompt();
    await updatePrompt(db, id, COLLAB, {
      name: "Edited",
      isPrivate: false, // collaborator must NOT be able to flip privacy
      priceCents: 9999, // …or set a price
      sharedWith: [STRANGER], // …or change who can view
      collaborators: [STRANGER], // …or add/remove collaborators
    });
    const row = await getPrompt(db, id);
    expect(row?.name).toBe("Edited"); // content change applied
    expect(row?.isPrivate).toBe(true); // privacy unchanged
    expect(row?.sharedWith).toEqual([VIEWER]); // share list unchanged
    expect(row?.collaborators).toEqual([COLLAB]); // collaborator list unchanged
  });

  it("lets the owner change all fields including the collaborator list", async () => {
    const id = await makePrompt();
    const ok = await updatePrompt(db, id, OWNER, {
      isPrivate: false,
      priceCents: 500,
      collaborators: [COLLAB, "newcollab@x.com"],
    });
    expect(ok).toBe(true);
    const row = await getPrompt(db, id);
    expect(row?.isPrivate).toBe(false);
    expect(row?.collaborators).toEqual([COLLAB, "newcollab@x.com"]);
  });

  it("denies edits from a read-only shared viewer and from strangers", async () => {
    const id = await makePrompt();
    expect(await updatePrompt(db, id, VIEWER, { name: "hacked" })).toBe(false);
    expect(await updatePrompt(db, id, STRANGER, { name: "hacked" })).toBe(false);
    const row = await getPrompt(db, id);
    expect(row?.name).toBe("Shared work"); // untouched
  });

  it("exposes canEdit / isCollaborator via getPromptDetail", async () => {
    const id = await makePrompt();
    const asCollab = await getPromptDetail(db, id, COLLAB);
    expect(asCollab?.canEdit).toBe(true);
    expect(asCollab?.isCollaborator).toBe(true);
    expect(asCollab?.isOwner).toBe(false);

    const asOwner = await getPromptDetail(db, id, OWNER);
    expect(asOwner?.canEdit).toBe(true);
    expect(asOwner?.isOwner).toBe(true);

    const asViewer = await getPromptDetail(db, id, VIEWER);
    expect(asViewer?.canEdit).toBe(false);
    expect(asViewer?.isCollaborator).toBe(false);
  });

  it("only exposes the collaborator list to the owner", async () => {
    const id = await makePrompt();
    const asOwner = await getPromptDetail(db, id, OWNER) as { collaborators?: string[] };
    const asCollab = await getPromptDetail(db, id, COLLAB) as { collaborators?: string[] };
    expect(asOwner.collaborators).toEqual([COLLAB]);
    expect(asCollab.collaborators).toBeUndefined();
  });

  it("surfaces collaborator prompts in listSharedWithMe", async () => {
    const id = await makePrompt();
    const forCollab = await listSharedWithMe(db, COLLAB);
    const forViewer = await listSharedWithMe(db, VIEWER);
    expect(forCollab.map((p) => p.id)).toContain(id);
    expect(forViewer.map((p) => p.id)).toContain(id);
    expect((await listSharedWithMe(db, STRANGER)).map((p) => p.id)).not.toContain(id);
  });

  it("snapshots a version when a collaborator edits content", async () => {
    const id = await makePrompt();
    await updatePrompt(db, id, COLLAB, { body: "v2" }, { message: "collab edit" });
    const versions = await db.collection("promptVersions").find({ promptId: id }).toArray();
    expect(versions).toHaveLength(1);
    expect(versions[0].body).toBe("original"); // prior content snapshotted
  });
});
