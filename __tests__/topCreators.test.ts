import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser, ensureHandle, topCreators } from "../lib/users";
import { createPrompt, toggleStar } from "../lib/prompts";
import { followCreator } from "../lib/follows";

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
  for (const c of ["users", "prompts", "follows"]) await db.collection(c).deleteMany({});
});

describe("topCreators", () => {
  it("ranks creators by followers + stars + prompts and resolves handle/name", async () => {
    for (const [email, name] of [["a@x.com", "Alice"], ["b@x.com", "Bob"], ["fan@x.com", "Fan"]]) {
      await createUser(db, email, "pw", name);
      await ensureHandle(db, email);
    }
    // Alice: 2 prompts, 1 star, 1 follower
    const a1 = await createPrompt(db, "a@x.com", { name: "A1", description: "d", category: "Writing", body: "x" });
    await createPrompt(db, "a@x.com", { name: "A2", description: "d", category: "Writing", body: "x" });
    await toggleStar(db, a1.id, "fan@x.com");
    const aliceHandle = (await db.collection("users").findOne({ email: "a@x.com" }))!.handle;
    await followCreator(db, "fan@x.com", aliceHandle);
    // Bob: 1 prompt, no stars/followers
    await createPrompt(db, "b@x.com", { name: "B1", description: "d", category: "Writing", body: "x" });

    const creators = await topCreators(db, 10);
    expect(creators[0].handle).toBe(aliceHandle);
    expect(creators[0]).toMatchObject({ name: "Alice", prompts: 2, stars: 1, followers: 1 });
    expect(creators.find((c) => c.name === "Bob")).toMatchObject({ prompts: 1, stars: 0, followers: 0 });
    // ranking: Alice above Bob
    expect(creators.map((c) => c.name).indexOf("Alice")).toBeLessThan(creators.map((c) => c.name).indexOf("Bob"));
  });

  it("excludes creators without a handle and respects the limit", async () => {
    await createUser(db, "nohandle@x.com", "pw", "NoHandle");
    // Simulate a legacy account that predates auto-handle assignment.
    await db.collection("users").updateOne({ email: "nohandle@x.com" }, { $unset: { handle: "" } });
    await createPrompt(db, "nohandle@x.com", { name: "X", description: "d", category: "Writing", body: "x" });
    expect(await topCreators(db, 10)).toEqual([]);
  });

  it("paginates with offset over the ranked list without overlap", async () => {
    // Six creators each with a distinct prompt count → strict descending rank.
    for (let i = 0; i < 6; i++) {
      const email = `c${i}@x.com`;
      await createUser(db, email, "pw", `Creator${i}`);
      await ensureHandle(db, email);
      for (let j = 0; j <= 5 - i; j++) {
        await createPrompt(db, email, { name: `c${i}-${j}`, description: "d", category: "Writing", body: "x" });
      }
    }
    const full = await topCreators(db, 100);
    expect(full).toHaveLength(6);
    const page1 = await topCreators(db, 4, 0);
    const page2 = await topCreators(db, 4, 4);
    expect(page1.map((c) => c.handle)).toEqual(full.slice(0, 4).map((c) => c.handle));
    expect(page2.map((c) => c.handle)).toEqual(full.slice(4).map((c) => c.handle));
    expect(page2).toHaveLength(2);
  });
});
