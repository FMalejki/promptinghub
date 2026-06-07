import { weekOverWeek } from "../lib/analyticsSummary";

// helper: build a series of given daily counts
const series = (counts: number[]) =>
  counts.map((count, i) => ({ day: `2026-01-${String(i + 1).padStart(2, "0")}`, count }));

describe("weekOverWeek", () => {
  it("compares the last 7 days against the prior 7", () => {
    // prior week totals 7, recent week totals 14 → +100%
    const s = weekOverWeek(series([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]));
    expect(s.recent).toBe(14);
    expect(s.prior).toBe(7);
    expect(s.deltaPct).toBe(100);
    expect(s.direction).toBe("up");
  });

  it("reports a downward trend", () => {
    const s = weekOverWeek(series([4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2]));
    expect(s.recent).toBe(14);
    expect(s.prior).toBe(28);
    expect(s.deltaPct).toBe(-50);
    expect(s.direction).toBe("down");
  });

  it("flat when equal", () => {
    const s = weekOverWeek(series([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]));
    expect(s.deltaPct).toBe(0);
    expect(s.direction).toBe("flat");
  });

  it("null delta when there is no prior activity to compare against", () => {
    const s = weekOverWeek(series([0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 3]));
    expect(s.prior).toBe(0);
    expect(s.recent).toBe(21);
    expect(s.deltaPct).toBeNull();
    expect(s.direction).toBe("up");
  });

  it("flat with no activity at all", () => {
    const s = weekOverWeek(series(new Array(14).fill(0)));
    expect(s.deltaPct).toBeNull();
    expect(s.direction).toBe("flat");
  });

  it("uses only the trailing 14 points when given more", () => {
    const s = weekOverWeek(series([99, 99, ...new Array(7).fill(1), ...new Array(7).fill(1)]));
    expect(s.recent).toBe(7);
    expect(s.prior).toBe(7);
  });

  it("returns zeros for a short/empty series", () => {
    expect(weekOverWeek([])).toEqual({ recent: 0, prior: 0, deltaPct: null, direction: "flat" });
  });
});
