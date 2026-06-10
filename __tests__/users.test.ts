import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser, verifyCredentials, getProfile, updateProfile } from "../lib/users";

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
    await createUser(db, "a@b.com", "secret123");
    const row = await db.collection("users").findOne({ email: "a@b.com" });
    expect(row?.passwordHash).toBeDefined();
    expect(row?.passwordHash).not.toBe("secret123");
  });

  it("defaults name to the email prefix when none given", async () => {
    const user = await createUser(db, "john.doe@b.com", "secret123");
    expect(user.name).toBe("john.doe");
  });

  it("stores a provided name", async () => {
    const user = await createUser(db, "a@b.com", "secret123", "Ada");
    expect(user.name).toBe("Ada");
  });

  it("starts with a null image", async () => {
    await createUser(db, "a@b.com", "secret123");
    expect((await getProfile(db, "a@b.com"))?.image).toBeNull();
  });

  it("rejects duplicate email", async () => {
    await createUser(db, "a@b.com", "secret123");
    await expect(createUser(db, "a@b.com", "other")).rejects.toThrow(/exists/i);
  });
});

describe("verifyCredentials", () => {
  it("returns user with name when password matches", async () => {
    await createUser(db, "a@b.com", "secret123", "Ada");
    const user = await verifyCredentials(db, "a@b.com", "secret123");
    expect(user).toEqual(expect.objectContaining({ email: "a@b.com", name: "Ada" }));
  });

  it("returns null when password is wrong", async () => {
    await createUser(db, "a@b.com", "secret123");
    expect(await verifyCredentials(db, "a@b.com", "WRONG")).toBeNull();
  });

  it("returns null when user does not exist", async () => {
    expect(await verifyCredentials(db, "nobody@b.com", "secret123")).toBeNull();
  });
});

describe("profiles", () => {
  it("getProfile returns email, name, image", async () => {
    await createUser(db, "a@b.com", "secret123", "Ada");
    expect(await getProfile(db, "a@b.com")).toEqual({ email: "a@b.com", name: "Ada", image: null, bio: null, website: null, x: null, github: null, mutedNotificationTypes: [] });
  });

  it("getProfile returns null for unknown user", async () => {
    expect(await getProfile(db, "nope@b.com")).toBeNull();
  });

  it("updateProfile changes name and image", async () => {
    await createUser(db, "a@b.com", "secret123");
    const updated = await updateProfile(db, "a@b.com", { name: "New Name", image: "http://img/x.png" });
    expect(updated).toEqual({ email: "a@b.com", name: "New Name", image: "http://img/x.png", bio: null, website: null, x: null, github: null, mutedNotificationTypes: [] });
  });

  it("updateProfile applies a partial update", async () => {
    await createUser(db, "a@b.com", "secret123", "Keep");
    await updateProfile(db, "a@b.com", { image: "http://img/y.png" });
    expect(await getProfile(db, "a@b.com")).toEqual({ email: "a@b.com", name: "Keep", image: "http://img/y.png", bio: null, website: null, x: null, github: null, mutedNotificationTypes: [] });
  });
});
