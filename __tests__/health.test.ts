import { healthPayload, healthStatus } from "../lib/health";

const now = new Date("2026-06-07T12:00:00Z");

describe("health", () => {
  it("reports ok + db up when the DB is reachable", () => {
    expect(healthPayload(true, now)).toEqual({
      ok: true,
      db: "up",
      time: "2026-06-07T12:00:00.000Z",
    });
    expect(healthStatus(true)).toBe(200);
  });

  it("reports not-ok + db down with a 503 when the DB is unreachable", () => {
    expect(healthPayload(false, now)).toEqual({
      ok: false,
      db: "down",
      time: "2026-06-07T12:00:00.000Z",
    });
    expect(healthStatus(false)).toBe(503);
  });
});
