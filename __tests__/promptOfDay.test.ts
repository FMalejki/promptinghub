import { dateKey, pickOfTheDay } from "../lib/promptOfDay";

describe("promptOfDay", () => {
  it("formats a date as a stable YYYY-MM-DD UTC key", () => {
    expect(dateKey(new Date("2026-06-07T23:30:00Z"))).toBe("2026-06-07");
    expect(dateKey(new Date("2026-01-02T00:00:00Z"))).toBe("2026-01-02");
  });

  it("picks the same item all day and a (usually) different one the next day", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g"];
    const d1morning = pickOfTheDay(items, new Date("2026-06-07T06:00:00Z"));
    const d1night = pickOfTheDay(items, new Date("2026-06-07T22:00:00Z"));
    expect(d1morning).toBe(d1night); // deterministic within a day

    // Across a week of distinct days we should see more than one distinct pick.
    const days = ["2026-06-07", "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12", "2026-06-13"];
    const picks = new Set(days.map((d) => pickOfTheDay(items, new Date(`${d}T12:00:00Z`))));
    expect(picks.size).toBeGreaterThan(1);
  });

  it("always returns a member of the list", () => {
    const items = ["x", "y", "z"];
    for (const d of ["2026-06-07", "2026-12-31", "2027-03-15"]) {
      expect(items).toContain(pickOfTheDay(items, new Date(`${d}T12:00:00Z`)));
    }
  });

  it("returns null for an empty list", () => {
    expect(pickOfTheDay([], new Date("2026-06-07T12:00:00Z"))).toBeNull();
  });

  it("is index-stable: same date + same list ⇒ same pick", () => {
    const items = ["a", "b", "c", "d"];
    const a = pickOfTheDay(items, new Date("2026-06-07T01:00:00Z"));
    const b = pickOfTheDay(items, new Date("2026-06-07T18:00:00Z"));
    expect(a).toBe(b);
  });
});
