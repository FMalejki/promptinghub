import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { submitFeedback, listFeedback, normalizeCategory } from "../lib/feedback";

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
  await db.collection("feedback").deleteMany({});
});

describe("normalizeCategory", () => {
  it("keeps known categories and falls back to 'other'", () => {
    expect(normalizeCategory("bug")).toBe("bug");
    expect(normalizeCategory("idea")).toBe("idea");
    expect(normalizeCategory("nonsense")).toBe("other");
    expect(normalizeCategory(undefined)).toBe("other");
  });
});

describe("submitFeedback", () => {
  it("rejects an empty/whitespace message", async () => {
    expect(await submitFeedback(db, { message: "" })).toBeNull();
    expect(await submitFeedback(db, { message: "   \n " })).toBeNull();
    expect(await db.collection("feedback").countDocuments()).toBe(0);
  });

  it("persists feedback with normalized fields", async () => {
    const res = await submitFeedback(db, {
      message: "  The browse filter is confusing  ",
      category: "confusing",
      email: " user@x.com ",
      page: "/browse",
    });
    expect(res?.id).toBeTruthy();
    const row = await db.collection("feedback").findOne({});
    expect(row?.message).toBe("The browse filter is confusing"); // trimmed
    expect(row?.category).toBe("confusing");
    expect(row?.email).toBe("user@x.com"); // trimmed
    expect(row?.page).toBe("/browse");
    expect(row?.simulated).toBe(false);
    expect(row?.status).toBe("open");
  });

  it("coerces an unknown category to 'other' and caps message length", async () => {
    await submitFeedback(db, { message: "x".repeat(5000), category: "lol" });
    const row = await db.collection("feedback").findOne({});
    expect(row?.category).toBe("other");
    expect(row?.message.length).toBe(2000);
  });
});

describe("listFeedback", () => {
  it("returns newest first and excludes simulated by default", async () => {
    await submitFeedback(db, { message: "real one", category: "bug" });
    await submitFeedback(db, { message: "persona one", category: "idea", simulated: true });
    const real = await listFeedback(db);
    expect(real.map((f) => f.message)).toEqual(["real one"]);
    const all = await listFeedback(db, { includeSimulated: true });
    expect(all).toHaveLength(2);
  });
});
