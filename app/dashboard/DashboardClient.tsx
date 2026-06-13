"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Navbar } from "../components/Navbar";
import { weekOverWeek } from "@/lib/analyticsSummary";

type Row = { id: string; name: string; copyCount: number; stars: number; forkCount: number; isPrivate: boolean };
type SeriesPoint = { day: string; copies: number; views: number };
type Analytics = { totals: { prompts: number; copies: number; stars: number; forks: number }; perPrompt: Row[]; series: SeriesPoint[] };

type Metric = "activity" | "copies" | "views";
const METRICS: { key: Metric; label: string; color: string }[] = [
  { key: "activity", label: "Activity", color: "#3b82f6" },
  { key: "copies", label: "Copies", color: "#8b5cf6" },
  { key: "views", label: "Views", color: "#10b981" },
];
// Activity = everything together (copies + views); the others isolate one signal.
function valueOf(p: SeriesPoint, metric: Metric): number {
  if (metric === "copies") return p.copies;
  if (metric === "views") return p.views;
  return p.copies + p.views;
}

function Sparkline({ series }: { series: SeriesPoint[] }) {
  const [metric, setMetric] = useState<Metric>("activity");
  if (!series || series.length === 0) return null;
  const w = 600;
  const h = 80;
  const active = METRICS.find((m) => m.key === metric) || METRICS[0];
  const pointsForMetric = series.map((p) => ({ day: p.day, count: valueOf(p, metric) }));
  const max = Math.max(1, ...pointsForMetric.map((p) => p.count));
  const dx = series.length > 1 ? w / (series.length - 1) : 0;
  const pts = pointsForMetric.map((p, i) => `${i * dx},${h - (p.count / max) * (h - 8) - 4}`);
  const total = pointsForMetric.reduce((s, p) => s + p.count, 0);
  const trend = weekOverWeek(pointsForMetric);
  const trendColor =
    trend.direction === "up"
      ? "text-green-600 dark:text-green-400"
      : trend.direction === "down"
      ? "text-red-600 dark:text-red-400"
      : "text-gray-500 dark:text-gray-400";
  const trendLabel =
    trend.deltaPct === null
      ? trend.recent > 0
        ? "new this week"
        : null
      : `${trend.deltaPct > 0 ? "+" : ""}${trend.deltaPct}% vs last week`;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{active.label} — last 14 days</h2>
        <div className="flex items-baseline gap-2">
          {trendLabel && (
            <span className={`text-xs font-medium ${trendColor}`}>
              {trend.direction === "up" ? "▲ " : trend.direction === "down" ? "▼ " : ""}
              {trendLabel}
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">{total} total</span>
        </div>
      </div>
      {/* Metric selector — defaults to combined Activity. */}
      <div className="flex items-center gap-1 mb-3 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 w-fit">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              metric === m.key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
        <polyline fill="none" stroke={active.color} strokeWidth="2" points={pts.join(" ")} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>{series[0]?.day.slice(5)}</span>
        <span>{series[series.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { status } = useSession();
  const [data, setData] = useState<Analytics | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "anon" | "error">("loading");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Delete one of your own prompts straight from the dashboard (no need to open
  // the editor). Confirms first; on success drops the row + decrements the count.
  async function deletePrompt(row: Row) {
    if (deleting) return;
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    setDeleting(row.id);
    try {
      const res = await fetch(`/api/prompts/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Couldn't delete that prompt. Please try again.");
        return;
      }
      setData((d) =>
        d
          ? {
              ...d,
              totals: { ...d.totals, prompts: Math.max(0, d.totals.prompts - 1) },
              perPrompt: d.perPrompt.filter((p) => p.id !== row.id),
            }
          : d,
      );
    } catch {
      alert("Couldn't delete that prompt. Check your connection.");
    } finally {
      setDeleting(null);
    }
  }

  const load = useCallback(() => {
    setState("loading");
    fetch("/api/analytics")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("anon");
      return;
    }
    load();
  }, [status, load]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your dashboard</h1>

        {state === "anon" ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</Link> to see your prompt stats.
          </div>
        ) : state === "error" ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Couldn&apos;t load your stats</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Something went wrong. Check your connection and try again.</p>
            <button
              onClick={load}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        ) : state === "loading" || !data ? (
          <div className="text-gray-500 dark:text-gray-400">Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Stat label="Prompts" value={data.totals.prompts} />
              <Stat label="Total copies" value={data.totals.copies} />
              <Stat label="Total stars" value={data.totals.stars} />
              <Stat label="Total forks" value={data.totals.forks} />
            </div>

            <Sparkline series={data.series} />

            {data.perPrompt.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                You haven&apos;t published any prompts yet.
              </div>
            ) : (
              <div className="overflow-x-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 font-medium">Prompt</th>
                      <th className="px-4 py-3 font-medium text-right">Copies</th>
                      <th className="px-4 py-3 font-medium text-right">Stars</th>
                      <th className="px-4 py-3 font-medium text-right">Forks</th>
                      <th className="px-4 py-3 font-medium text-right sr-only">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.perPrompt.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/prompt/${r.id}`} className="text-gray-900 dark:text-white hover:underline">
                            {r.name}
                          </Link>
                          {r.isPrivate && <span className="ml-2 text-xs text-gray-400">private</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{r.copyCount}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{r.stars}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{r.forkCount}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/prompt/${r.id}/edit`}
                              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => deletePrompt(r)}
                              disabled={deleting === r.id}
                              title="Delete this prompt"
                              aria-label={`Delete ${r.name}`}
                              className="text-xs font-medium text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                            >
                              {deleting === r.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
