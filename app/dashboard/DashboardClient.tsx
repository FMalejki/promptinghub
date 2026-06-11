"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Navbar } from "../components/Navbar";
import { weekOverWeek } from "@/lib/analyticsSummary";

type Row = { id: string; name: string; copyCount: number; stars: number; forkCount: number; isPrivate: boolean };
type SeriesPoint = { day: string; count: number };
type Analytics = { totals: { prompts: number; copies: number; stars: number; forks: number }; perPrompt: Row[]; series: SeriesPoint[] };

function Sparkline({ series }: { series: SeriesPoint[] }) {
  if (!series || series.length === 0) return null;
  const w = 600;
  const h = 80;
  const max = Math.max(1, ...series.map((p) => p.count));
  const dx = series.length > 1 ? w / (series.length - 1) : 0;
  const pts = series.map((p, i) => `${i * dx},${h - (p.count / max) * (h - 8) - 4}`);
  const total = series.reduce((s, p) => s + p.count, 0);
  const trend = weekOverWeek(series);
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
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Copies — last 14 days</h2>
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
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={pts.join(" ")} vectorEffect="non-scaling-stroke" />
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
