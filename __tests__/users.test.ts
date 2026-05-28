import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser, verifyCredentials } from "../lib/users";

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

describe("createUser", () => {
  it("stores user with hashed password", async () => {
    const user = await createUser(db, "a@b.com", "secret123");
    expect(user.email).toBe("a@b.com");
    const row = await db.collection("users").findOne({ email: "a@b.com" });
    expect(row?.passwordHash).toBeDefined();
    expect(row?.passwordHash).not.toBe("secret123");
  });

  it("rejects duplicate email", async () => {
    await createUser(db, "a@b.com", "secret123");
    await expect(createUser(db, "a@b.com", "other")).rejects.toThrow(/exists/i);
  });
});

describe("verifyCredentials", () => {
  it("returns user when password matches", async () => {
    await createUser(db, "a@b.com", "secret123");
    const user = await verifyCredentials(db, "a@b.com", "secret123");
    expect(user?.email).toBe("a@b.com");
  });

  it("returns null when password is wrong", async () => {
    await createUser(db, "a@b.com", "secret123");
    const user = await verifyCredentials(db, "a@b.com", "WRONG");
    expect(user).toBeNull();
  });

  it("returns null when user does not exist", async () => {
    const user = await verifyCredentials(db, "nobody@b.com", "secret123");
    expect(user).toBeNull();
  });
});
