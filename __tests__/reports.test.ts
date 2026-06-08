import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { reportPrompt, listOpenReports, resolveReport } from "../lib/reports";
import { createPrompt } from "../lib/prompts";

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
  for (const c of ["prompts", "reports"]) await db.collection(c).deleteMany({});
});

describe("reports", () => {
  it("files a report and lists it for moderators with the prompt name", async () => {
    const p = await createPrompt(db, "owner@x.com", { name: "Spammy", description: "d", category: "Writing", body: "x" });
    const r = await reportPrompt(db, p.id, "reporter@x.com", "spam");
    expect(r).toMatchObject({ ok: true });

    const open = await listOpenReports(db);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ promptId: p.id, promptName: "Spammy", reason: "spam", reporterEmail: "reporter@x.com", status: "open" });
  });

  it("rejects an empty reason and an invalid prompt id", async () => {
    expect(await reportPrompt(db, "nope", "r@x.com", "spam")).toEqual({ ok: false, error: "not_found" });
    const p = await createPrompt(db, "o@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    expect(await reportPrompt(db, p.id, "r@x.com", "   ")).toEqual({ ok: false, error: "empty_reason" });
  });

  it("dedupes repeat reports from the same reporter on the same prompt", async () => {
    const p = await createPrompt(db, "o@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    await reportPrompt(db, p.id, "r@x.com", "spam");
    await reportPrompt(db, p.id, "r@x.com", "spam again");
    expect(await listOpenReports(db)).toHaveLength(1);
  });

  it("resolves a report so it leaves the open queue", async () => {
    const p = await createPrompt(db, "o@x.com", { name: "P", description: "d", category: "Writing", body: "x" });
    await reportPrompt(db, p.id, "r@x.com", "spam");
    const [open] = await listOpenReports(db);
    expect(await resolveReport(db, open.id, "dismissed")).toBe(true);
    expect(await listOpenReports(db)).toHaveLength(0);
    expect(await resolveReport(db, "nope", "dismissed")).toBe(false);
  });
});
