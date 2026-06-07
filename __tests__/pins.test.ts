import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser } from "../lib/users";
import { createPrompt } from "../lib/prompts";
import { togglePin, getPinnedPromptIds, MAX_PINS } from "../lib/pins";

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
  for (const c of ["users", "prompts"]) await db.collection(c).deleteMany({});
  await createUser(db, "me@x.com", "pw", "Me");
});

describe("pins", () => {
  it("pins and unpins an owned prompt", async () => {
    const p = await createPrompt(db, "me@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    expect(await togglePin(db, "me@x.com", p.id)).toEqual({ ok: true, pinned: [p.id] });
    expect(await getPinnedPromptIds(db, "me@x.com")).toEqual([p.id]);
    expect(await togglePin(db, "me@x.com", p.id)).toEqual({ ok: true, pinned: [] });
  });

  it("refuses to pin a prompt you don't own", async () => {
    const other = await createPrompt(db, "other@x.com", { name: "O", description: "d", category: "Writing", body: "x" });
    expect(await togglePin(db, "me@x.com", other.id)).toEqual({ ok: false, error: "not_owner" });
  });

  it("enforces the max pin count", async () => {
    const ids: string[] = [];
    for (let i = 0; i <= MAX_PINS; i++) {
      const p = await createPrompt(db, "me@x.com", { name: `P${i}`, description: "d", category: "Writing", body: "x" });
      ids.push(p.id);
    }
    for (let i = 0; i < MAX_PINS; i++) await togglePin(db, "me@x.com", ids[i]);
    expect(await togglePin(db, "me@x.com", ids[MAX_PINS])).toEqual({ ok: false, error: "max" });
    expect(await getPinnedPromptIds(db, "me@x.com")).toHaveLength(MAX_PINS);
  });
});
