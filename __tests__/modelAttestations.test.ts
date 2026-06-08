import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  aggregateAttestations,
  attestModel,
  removeAttestation,
  listAttestations,
  isValidVote,
} from "../lib/modelAttestations";

describe("aggregateAttestations (pure)", () => {
  const rows = [
    { modelId: "gpt-4", email: "a@x.com", vote: "works" as const },
    { modelId: "gpt-4", email: "b@x.com", vote: "works" as const },
    { modelId: "gpt-4", email: "c@x.com", vote: "broken" as const },
    { modelId: "gpt-4", email: "d@x.com", vote: "mixed" as const },
    { modelId: "claude-3-opus", email: "a@x.com", vote: "broken" as const },
  ];

  it("folds rows into per-model works/broken/mixed counts", () => {
    const out = aggregateAttestations(rows);
    const gpt4 = out.find((m) => m.modelId === "gpt-4")!;
    expect(gpt4).toMatchObject({ works: 2, broken: 1, mixed: 1 });
    const opus = out.find((m) => m.modelId === "claude-3-opus")!;
    expect(opus).toMatchObject({ works: 0, broken: 1, mixed: 0 });
  });

  it("counts a mixed vote toward the total ordering", () => {
    const out = aggregateAttestations(rows);
    // gpt-4 has 4 votes (2+1+1), claude 1 → gpt-4 first
    expect(out[0].modelId).toBe("gpt-4");
    expect(out.find((m) => m.modelId === "gpt-4")!.mixed).toBe(1);
  });

  it("surfaces the viewer's own vote (or null)", () => {
    const out = aggregateAttestations(rows, "a@x.com");
    expect(out.find((m) => m.modelId === "gpt-4")!.youVoted).toBe("works");
    expect(out.find((m) => m.modelId === "claude-3-opus")!.youVoted).toBe("broken");
    const noViewer = aggregateAttestations(rows);
    expect(noViewer[0].youVoted).toBeNull();
  });

  it("orders by total attestations desc", () => {
    expect(aggregateAttestations(rows).map((m) => m.modelId)).toEqual(["gpt-4", "claude-3-opus"]);
  });

  it("is empty for no rows", () => {
    expect(aggregateAttestations([])).toEqual([]);
  });
});

describe("isValidVote", () => {
  it("accepts works/broken/mixed only", () => {
    expect(isValidVote("works")).toBe(true);
    expect(isValidVote("broken")).toBe(true);
    expect(isValidVote("mixed")).toBe(true);
    expect(isValidVote("maybe")).toBe(false);
    expect(isValidVote("")).toBe(false);
  });
});

describe("attestModel (DB, upsert + toggle)", () => {
  let mongod: MongoMemoryServer, client: MongoClient, db: Db;
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
    await db.collection("modelAttestations").deleteMany({});
  });

  it("records a vote and lists it", async () => {
    await attestModel(db, "p1", "a@x.com", "gpt-4", "works");
    const rows = await listAttestations(db, "p1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ modelId: "gpt-4", email: "a@x.com", vote: "works" });
  });

  it("upserts: re-voting the same model replaces (no duplicate)", async () => {
    await attestModel(db, "p1", "a@x.com", "gpt-4", "works");
    await attestModel(db, "p1", "a@x.com", "gpt-4", "broken");
    const rows = await listAttestations(db, "p1");
    expect(rows).toHaveLength(1);
    expect(rows[0].vote).toBe("broken");
  });

  it("records a mixed vote and aggregates it", async () => {
    await attestModel(db, "p1", "a@x.com", "gpt-4", "mixed");
    const agg = aggregateAttestations(await listAttestations(db, "p1"), "a@x.com");
    const gpt4 = agg.find((m) => m.modelId === "gpt-4")!;
    expect(gpt4.mixed).toBe(1);
    expect(gpt4.youVoted).toBe("mixed");
  });

  it("keeps votes from different users separate", async () => {
    await attestModel(db, "p1", "a@x.com", "gpt-4", "works");
    await attestModel(db, "p1", "b@x.com", "gpt-4", "works");
    const agg = aggregateAttestations(await listAttestations(db, "p1"));
    expect(agg.find((m) => m.modelId === "gpt-4")!.works).toBe(2);
  });

  it("removes a vote (toggle off)", async () => {
    await attestModel(db, "p1", "a@x.com", "gpt-4", "works");
    await removeAttestation(db, "p1", "a@x.com", "gpt-4");
    expect(await listAttestations(db, "p1")).toHaveLength(0);
  });

  it("scopes by prompt", async () => {
    await attestModel(db, "p1", "a@x.com", "gpt-4", "works");
    await attestModel(db, "p2", "a@x.com", "gpt-4", "works");
    expect(await listAttestations(db, "p1")).toHaveLength(1);
  });
});
