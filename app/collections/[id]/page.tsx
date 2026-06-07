"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "../../components/Navbar";
import { PromptCard } from "../../components/PromptCard";

type CollectionDetail = {
  id: string;
  ownerEmail: string;
  name: string;
  description: string;
  prompts: React.ComponentProps<typeof PromptCard>[];
};

function SubscribeButton({ id }: { id: string }) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [subscribers, setSubscribers] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/collections/${id}/subscribe`)
      .then((r) => (r.ok ? r.json() : { subscribed: false, subscribers: 0 }))
      .then((d) => {
        setSubscribed(!!d.subscribed);
        setSubscribers(d.subscribers || 0);
      })
      .catch(() => setSubscribed(false));
  }, [id]);

  async function toggle() {
    if (subscribed === null || busy) return;
    setBusy(true);
    const next = !subscribed;
    setSubscribed(next);
    setSubscribers((n) => n + (next ? 1 : -1)); // optimistic
    const res = await fetch(`/api/collections/${id}/subscribe`, { method: next ? "POST" : "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      setSubscribed(!next);
      setSubscribers((n) => n + (next ? -1 : 1));
      if (res?.status === 401) window.location.href = "/login";
    }
    setBusy(false);
  }

  if (subscribed === null) return null;
  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={`${subscribers} subscriber${subscribers === 1 ? "" : "s"}`}
      className={
        subscribed
          ? "px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          : "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      }
    >
      {subscribed ? "Subscribed" : "Subscribe"}
      {subscribers > 0 && <span className="ml-1.5 opacity-70">· {subscribers}</span>}
    </button>
  );
}

export default function CollectionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/collections/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCollection)
      .catch(() => router.push("/browse"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const isOwner = session?.user?.email && collection && session.user.email === collection.ownerEmail;

  async function del() {
    if (!confirm("Delete this collection? The prompts themselves are not deleted.")) return;
    const res = await fetch(`/api/collections/${params.id}`, { method: "DELETE" });
    if (res.ok) router.push(`/user/${encodeURIComponent(collection!.ownerEmail)}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        ) : collection ? (
          <>
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 mb-2 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 rounded-md px-2 py-1">
                  Collection
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{collection.name}</h1>
                {collection.description && <p className="mt-2 text-gray-600 dark:text-gray-400">{collection.description}</p>}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">{collection.prompts.length} prompts</p>
                <a
                  href={`/collections/${params.id}/feed.xml`}
                  target="_blank"
                  rel="noreferrer"
                  title="RSS feed of this collection"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.18 15.64a2.18 2.18 0 012.18 2.18C8.36 19 7.38 20 6.18 20 5 20 4 19 4 17.82a2.18 2.18 0 012.18-2.18zM4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27zm0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93z" />
                  </svg>
                  RSS
                </a>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!isOwner && <SubscribeButton id={params.id} />}
                {collection.prompts.length > 0 && (
                  <>
                    <a
                      href={`/api/collections/${params.id}/export`}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Export JSON
                    </a>
                    <a
                      href={`/api/collections/${params.id}/export?format=md`}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Export Markdown
                    </a>
                  </>
                )}
                {isOwner && (
                  <button
                    onClick={del}
                    className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {collection.prompts.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                No prompts yet. Open a prompt and use “Save to collection”.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collection.prompts.map((p) => (
                  <PromptCard key={p.id} {...p} />
                ))}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
