"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "../components/Navbar";

type Report = {
  id: string;
  promptId: string;
  promptName: string;
  reason: string;
  reporterEmail: string | null;
  createdAt: string;
};

type CommentReport = {
  id: string;
  commentId: string;
  commentBody: string;
  reason: string;
  reporterEmail: string | null;
  createdAt: string;
};

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [commentReports, setCommentReports] = useState<CommentReport[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");

  async function load() {
    const res = await fetch("/api/reports");
    if (res.status === 403 || res.status === 401) {
      setState("forbidden");
      return;
    }
    const d = await res.json();
    setReports(d.reports || []);
    setCommentReports(d.commentReports || []);
    setState("ok");
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, status: "resolved" | "dismissed") {
    setReports((rs) => rs.filter((r) => r.id !== id));
    await fetch(`/api/reports/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function actComment(id: string, status: "resolved" | "dismissed") {
    setCommentReports((rs) => rs.filter((r) => r.id !== id));
    await fetch(`/api/reports/comment/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Moderation queue</h1>

        {state === "forbidden" ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            This page is for verified moderators only.
          </div>
        ) : state === "loading" ? (
          <div className="text-gray-500 dark:text-gray-400">Loading…</div>
        ) : reports.length === 0 && commentReports.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No open reports. 🎉</div>
        ) : (
          <div className="space-y-8">
            {reports.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Prompt reports</h2>
                <ul className="space-y-3">
                  {reports.map((r) => (
                    <li key={r.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link href={`/prompt/${r.promptId}`} className="font-semibold text-gray-900 dark:text-white hover:underline">
                            {r.promptName}
                          </Link>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 break-words">{r.reason}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            reported by {r.reporterEmail || "anonymous"} · {new Date(r.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => act(r.id, "dismissed")} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                            Dismiss
                          </button>
                          <button onClick={() => act(r.id, "resolved")} className="px-3 py-1.5 text-xs bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 text-white rounded-lg">
                            Mark handled
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {commentReports.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Comment reports</h2>
                <ul className="space-y-3">
                  {commentReports.map((r) => (
                    <li key={r.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white break-words italic">“{r.commentBody}”</p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 break-words">{r.reason}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            reported by {r.reporterEmail || "anonymous"} · {new Date(r.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => actComment(r.id, "dismissed")} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                            Dismiss
                          </button>
                          <button onClick={() => actComment(r.id, "resolved")} className="px-3 py-1.5 text-xs bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 text-white rounded-lg">
                            Mark handled
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
