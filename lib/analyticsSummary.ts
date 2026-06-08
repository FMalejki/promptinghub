// Week-over-week trend from a daily copy timeseries, for a headline stat on the
// dashboard ("+100% vs last week"). Pure — operates on the series the analytics
// API already returns. Uses the trailing 14 points (recent 7 vs prior 7).

export type SeriesPoint = { day: string; count: number };

export type WeekTrend = {
  recent: number; // copies in the last 7 days
  prior: number; // copies in the 7 days before that
  deltaPct: number | null; // % change, or null when prior is 0 (no baseline)
  direction: "up" | "down" | "flat";
};

export function weekOverWeek(series: SeriesPoint[]): WeekTrend {
  const tail = series.slice(-14);
  const sum = (pts: SeriesPoint[]) => pts.reduce((s, p) => s + (p.count || 0), 0);

  const recent = sum(tail.slice(-7));
  const prior = sum(tail.slice(-14, -7));

  const direction = recent > prior ? "up" : recent < prior ? "down" : "flat";
  const deltaPct = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : null;

  return { recent, prior, deltaPct, direction };
}
