"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Navbar } from "../components/Navbar";

type Row = { id: string; name: string; copyCount: number; stars: number; forkCount: number; isPrivate: boolean };
type Analytics = { totals: { prompts: number; copies: number; stars: number; forks: number }; perPrompt: Row[] };

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
  const [state, setState] = useState<"loading" | "ok" | "anon">("loading");

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("anon");
      return;
    }
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {})
      .finally(() => setState("ok"));
  }, [status]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your dashboard</h1>

        {state === "anon" ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</Link> to see your prompt stats.
          </div>
        ) : !data ? (
          <div className="text-gray-500 dark:text-gray-400">Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Stat label="Prompts" value={data.totals.prompts} />
              <Stat label="Total copies" value={data.totals.copies} />
              <Stat label="Total stars" value={data.totals.stars} />
              <Stat label="Total forks" value={data.totals.forks} />
            </div>

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
