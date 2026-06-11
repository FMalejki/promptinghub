"use client";
import { useState } from "react";
import { Navbar } from "../../components/Navbar";

// Minimal first-party analytics dashboard. The data endpoint is gated by
// SEED_ADMIN_TOKEN; we never store the token — it lives in component state for the
// session only and is sent as a Bearer header to GET /api/admin/analytics.

type Agg = {
  windowDays: number;
  total: number;
  byType: Record<string, number>;
  topPaths: { path: string; count: number }[];
  uniqueVisitors: number;
};

export default function AdminAnalyticsPage() {
  const [token, setToken] = useState("");
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Agg | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`, {
        headers: { authorization: `Bearer ${token.trim()}` },
      });
      if (res.status === 404) {
        setError("Analytics endpoint is disabled (SEED_ADMIN_TOKEN not configured).");
        setData(null);
        return;
      }
      if (res.status === 401) {
        setError("Invalid admin token.");
        setData(null);
        return;
      }
      if (!res.ok) {
        setError("Failed to load analytics.");
        setData(null);
        return;
      }
      setData((await res.json()) as Agg);
    } catch {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          First-party, anonymous event counts. Admin token required.
        </p>

        <div className="flex flex-wrap items-end gap-3 mb-8">
          <label className="flex-1 min-w-[220px]">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Admin token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="SEED_ADMIN_TOKEN"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </label>
          <label>
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Days</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              {[1, 7, 14, 30, 90].map((d) => (
                <option key={d} value={d}>
                  {d}d
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={load}
            disabled={loading || !token.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Events" value={data.total} />
              <Stat label="Unique visitors" value={data.uniqueVisitors} />
              <Stat label="Window" value={`${data.windowDays}d`} />
            </div>

            <Section title="By event type">
              {Object.entries(data.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <Row key={type} label={type} count={count} />
                ))}
              {Object.keys(data.byType).length === 0 && <Empty />}
            </Section>

            <Section title="Top paths">
              {data.topPaths.map((p) => (
                <Row key={p.path} label={p.path} count={p.count} mono />
              ))}
              {data.topPaths.length === 0 && <Empty />}
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{title}</h2>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, count, mono }: { label: string; count: number; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={`text-gray-700 dark:text-gray-300 truncate ${mono ? "font-mono text-xs" : ""}`}>{label}</span>
      <span className="text-gray-900 dark:text-white tabular-nums shrink-0">{count}</span>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-gray-400 dark:text-gray-500">No data in this window.</p>;
}
