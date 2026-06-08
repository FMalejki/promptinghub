import { relativeTime } from "../lib/relativeTime";

const now = new Date("2026-06-07T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("relativeTime", () => {
  it("says 'just now' for very recent times", () => {
    expect(relativeTime(ago(5 * SEC), now)).toBe("just now");
  });

  it("formats minutes, hours and days", () => {
    expect(relativeTime(ago(1 * MIN), now)).toBe("1 minute ago");
    expect(relativeTime(ago(5 * MIN), now)).toBe("5 minutes ago");
    expect(relativeTime(ago(1 * HOUR), now)).toBe("1 hour ago");
    expect(relativeTime(ago(3 * HOUR), now)).toBe("3 hours ago");
    expect(relativeTime(ago(1 * DAY), now)).toBe("yesterday");
    expect(relativeTime(ago(4 * DAY), now)).toBe("4 days ago");
  });

  it("formats weeks, months and years", () => {
    expect(relativeTime(ago(14 * DAY), now)).toBe("2 weeks ago");
    expect(relativeTime(ago(60 * DAY), now)).toBe("2 months ago");
    expect(relativeTime(ago(800 * DAY), now)).toBe("2 years ago");
  });

  it("accepts an ISO string", () => {
    expect(relativeTime(ago(2 * HOUR).toISOString(), now)).toBe("2 hours ago");
  });

  it("clamps future times to 'just now'", () => {
    expect(relativeTime(new Date(now.getTime() + 10 * MIN), now)).toBe("just now");
  });

  it("returns empty string for an invalid date", () => {
    expect(relativeTime("not-a-date", now)).toBe("");
    expect(relativeTime(null as unknown as Date, now)).toBe("");
  });
});
