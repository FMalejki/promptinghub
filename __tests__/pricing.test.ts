import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { formatPrice, isPaid } from "../lib/pricing";
import { createPrompt, getPromptDetail, updatePrompt } from "../lib/prompts";

describe("pricing helpers", () => {
  it("formats cents as currency, and free for 0", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(500)).toBe("$5.00");
    expect(formatPrice(1299)).toBe("$12.99");
    expect(formatPrice(999, "EUR")).toBe("€9.99");
  });
  it("isPaid is true only for a positive price", () => {
    expect(isPaid(0)).toBe(false);
    expect(isPaid(undefined)).toBe(false);
    expect(isPaid(100)).toBe(true);
  });
});

describe("prompt pricing storage", () => {
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
    await db.collection("prompts").deleteMany({});
  });

  it("defaults priceCents to 0 (free)", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "b" });
    expect((await getPromptDetail(db, id))?.priceCents).toBe(0);
  });

  it("stores and updates a price", async () => {
    const { id } = await createPrompt(db, "a@x.com", { name: "P", description: "d", category: "Writing", body: "b", priceCents: 1500 });
    expect((await getPromptDetail(db, id))?.priceCents).toBe(1500);
    await updatePrompt(db, id, "a@x.com", { priceCents: 0 });
    expect((await getPromptDetail(db, id))?.priceCents).toBe(0);
  });
});
