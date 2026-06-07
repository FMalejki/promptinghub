import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ensureHandle, getCreatorProfile } from "../lib/users";
import { isVerifiedHandle } from "../lib/verified";

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

describe("isVerifiedHandle", () => {
  it("recognizes seeded founder handles, case-insensitively", () => {
    expect(isVerifiedHandle("adriankrawczyk")).toBe(true);
    expect(isVerifiedHandle("AdrianKrawczyk")).toBe(true);
    expect(isVerifiedHandle("filipmalejki")).toBe(true);
    expect(isVerifiedHandle("rando")).toBe(false);
  });
});

describe("getCreatorProfile", () => {
  it("resolves a creator by handle with verified flag", async () => {
    await db.collection("users").insertOne({ email: "a@x.com", name: "Adi", image: null });
    const handle = await ensureHandle(db, "a@x.com");
    const creator = await getCreatorProfile(db, handle);
    expect(creator?.email).toBe("a@x.com");
    expect(creator?.handle).toBe(handle);
    expect(creator?.verified).toBe(isVerifiedHandle(handle));
  });

  it("returns null for an unknown handle", async () => {
    expect(await getCreatorProfile(db, "ghost")).toBeNull();
  });
});
