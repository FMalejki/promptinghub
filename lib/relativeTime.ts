// Human-friendly "N units ago" formatting. Pure and injectable-now for tests.

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function unit(n: number, label: string): string {
  return `${n} ${label}${n === 1 ? "" : "s"} ago`;
}

export function relativeTime(value: Date | string, now: Date = new Date()): string {
  const t = value instanceof Date ? value.getTime() : Date.parse(value as string);
  if (!Number.isFinite(t)) return "";
  const diff = now.getTime() - t;
  if (diff < 45 * SEC) return "just now";
  if (diff < HOUR) return unit(Math.round(diff / MIN), "minute");
  if (diff < DAY) return unit(Math.round(diff / HOUR), "hour");
  if (diff < 2 * DAY) return "yesterday";
  if (diff < WEEK) return unit(Math.round(diff / DAY), "day");
  if (diff < MONTH) return unit(Math.round(diff / WEEK), "week");
  if (diff < YEAR) return unit(Math.round(diff / MONTH), "month");
  return unit(Math.round(diff / YEAR), "year");
}
