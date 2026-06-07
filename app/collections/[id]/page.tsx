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
              </div>
              {isOwner && (
                <button
                  onClick={del}
                  className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  Delete
                </button>
              )}
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
