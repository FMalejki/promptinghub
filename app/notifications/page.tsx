"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Navbar } from "../components/Navbar";

type Notif = {
  id: string;
  type: "follow" | "comment" | "fork" | "reply" | "mention" | "collection" | "share";
  actorName?: string;
  actorEmail: string;
  promptId?: string;
  promptName?: string;
  text?: string;
  read: boolean;
  createdAt: string;
};

function summarize(n: Notif): string {
  const who = n.actorName || n.actorEmail.split("@")[0];
  const on = n.promptName ? ` “${n.promptName}”` : " your prompt";
  if (n.type === "follow") return `${who} followed you`;
  if (n.type === "fork") return `${who} forked your prompt${n.promptName ? ` “${n.promptName}”` : ""}`;
  if (n.type === "share") return `${who} shared a locked prompt with you${n.promptName ? ` “${n.promptName}”` : ""}`;
  if (n.type === "reply") return `${who} replied to your comment on${on}`;
  if (n.type === "mention") return `${who} mentioned you on${on}`;
  if (n.type === "collection") return `${who} ${n.text || "updated a collection you follow"}`;
  return `${who} commented on${on}`;
}

export default function NotificationsPage() {
  const { status } = useSession();
  const [items, setItems] = useState<Notif[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "anon">("loading");

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("anon");
      return;
    }
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => setItems(d.notifications || []))
      .catch(() => {})
      .finally(() => setState("ok"));
  }, [status]);

  function markOne(id: string) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read: true } : x)));
    fetch(`/api/notifications/${id}`, { method: "POST" }).catch(() => {});
  }

  function markAll() {
    setItems((xs) => xs.map((x) => ({ ...x, read: true })));
    fetch("/api/notifications", { method: "POST" }).catch(() => {});
  }

  const anyUnread = items.some((n) => !n.read);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          {state === "ok" && anyUnread && (
            <button onClick={markAll} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Mark all read
            </button>
          )}
        </div>

        {state === "anon" ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</Link> to see your notifications.
          </div>
        ) : state === "loading" ? (
          <div className="text-gray-500 dark:text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">Nothing yet. Activity on your prompts shows up here.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => {
              const inner = (
                <div className={`p-4 rounded-lg border ${n.read ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"}`}>
                  <p className="text-sm text-gray-900 dark:text-white">{summarize(n)}</p>
                  {n.text && n.type !== "collection" && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">“{n.text}”</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.promptId ? (
                    <Link
                      href={n.type === "collection" ? `/collections/${n.promptId}` : `/prompt/${n.promptId}`}
                      onClick={() => markOne(n.id)}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button onClick={() => markOne(n.id)} className="block w-full text-left">
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
