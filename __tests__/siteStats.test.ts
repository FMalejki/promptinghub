import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser } from "../lib/users";
import { createPrompt, incrementCopyCount } from "../lib/prompts";
import { siteStats } from "../lib/siteStats";

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
  for (const c of ["users", "prompts", "copyEvents"]) await db.collection(c).deleteMany({});
  await createUser(db, "a@x.com", "pw", "A");
  await createUser(db, "b@x.com", "pw", "B");
});

describe("siteStats", () => {
  it("counts public prompts, distinct authors, and total copies", async () => {
    const p1 = await createPrompt(db, "a@x.com", {
      name: "P1", description: "d", category: "Writing", files: [{ path: "f", content: "x" }],
    } as any);
    await createPrompt(db, "a@x.com", {
      name: "P2", description: "d", category: "Writing", files: [{ path: "f", content: "x" }],
    } as any);
    await createPrompt(db, "b@x.com", {
      name: "P3", description: "d", category: "Writing", files: [{ path: "f", content: "x" }],
    } as any);
    // a private prompt should not count
    await createPrompt(db, "b@x.com", {
      name: "Secret", description: "d", category: "Writing", isPrivate: true, files: [{ path: "f", content: "x" }],
    } as any);

    await incrementCopyCount(db, p1.id);
    await incrementCopyCount(db, p1.id);

    const s = await siteStats(db);
    expect(s.prompts).toBe(3);
    expect(s.creators).toBe(2);
    expect(s.copies).toBe(2);
  });

  it("returns zeros on an empty catalog", async () => {
    expect(await siteStats(db)).toEqual({ prompts: 0, creators: 0, copies: 0 });
  });
});
