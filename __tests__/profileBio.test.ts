import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser, ensureHandle, updateProfile, getProfile, getCreatorProfile } from "../lib/users";

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
  await db.collection("users").deleteMany({});
});

describe("profile bio + links", () => {
  it("saves and returns bio + links via getProfile and getCreatorProfile", async () => {
    await createUser(db, "me@x.com", "pw", "Me");
    const handle = await ensureHandle(db, "me@x.com");
    await updateProfile(db, "me@x.com", {
      bio: "I write prompts.",
      website: "https://me.dev",
      x: "me_x",
      github: "me-gh",
    });

    const prof = await getProfile(db, "me@x.com");
    expect(prof).toMatchObject({ bio: "I write prompts.", website: "https://me.dev", x: "me_x", github: "me-gh" });

    const creator = await getCreatorProfile(db, handle);
    expect(creator).toMatchObject({ bio: "I write prompts.", website: "https://me.dev", x: "me_x", github: "me-gh" });
  });

  it("defaults to nulls when unset", async () => {
    await createUser(db, "me@x.com", "pw", "Me");
    const prof = await getProfile(db, "me@x.com");
    expect(prof).toMatchObject({ bio: null, website: null, x: null, github: null });
  });
});
