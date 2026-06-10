import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createUser, verifyCredentials, getProfile, updateProfile, searchUsersForMention } from "../lib/users";

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

  it("assigns a @handle derived from the email local part", async () => {
    await createUser(db, "ada.lovelace@b.com", "secret123");
    const row = await db.collection("users").findOne({ email: "ada.lovelace@b.com" });
    expect(row?.handle).toBe("ada-lovelace");
  });

  it("gives colliding local parts distinct handles", async () => {
    await createUser(db, "sam@one.com", "secret123");
    await createUser(db, "sam@two.com", "secret123");
    const a = await db.collection("users").findOne({ email: "sam@one.com" });
    const b = await db.collection("users").findOne({ email: "sam@two.com" });
    expect(a?.handle).toBe("sam");
    expect(b?.handle).toBe("sam-2");
  });
});

describe("searchUsersForMention", () => {
  beforeEach(async () => {
    await db.collection("users").insertMany([
      { email: "fm@x.com", name: "FMalejki", handle: "filipmalejki", image: null },
      { email: "ada@x.com", name: "Ada Lovelace", handle: "ada-lovelace", image: null },
      { email: "leg@x.com", name: "Legacy", image: null }, // no handle
    ]);
  });

  it("matches by display name substring (so @fmalejki finds @filipmalejki)", async () => {
    const out = await searchUsersForMention(db, "fmalejki");
    expect(out.map((u) => u.handle)).toContain("filipmalejki");
  });

  it("matches by handle prefix", async () => {
    const out = await searchUsersForMention(db, "ada");
    expect(out.map((u) => u.handle)).toEqual(["ada-lovelace"]);
  });

  it("excludes users without a handle", async () => {
    const out = await searchUsersForMention(db, "legacy");
    expect(out).toEqual([]);
  });

  it("returns [] for empty query and never leaks email", async () => {
    expect(await searchUsersForMention(db, "  ")).toEqual([]);
    const out = await searchUsersForMention(db, "ada");
    expect(out[0]).not.toHaveProperty("email");
  });

  it("treats the query as a literal (regex metacharacters don't throw or match-all)", async () => {
    const out = await searchUsersForMention(db, ".*");
    expect(out).toEqual([]);
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
