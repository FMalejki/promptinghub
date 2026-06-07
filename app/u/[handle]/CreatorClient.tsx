"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "../../components/Navbar";
import { PromptCard } from "../../components/PromptCard";
import { Avatar } from "../../Avatar";
import { FollowButton } from "../../FollowButton";
import { RecommendedCreators } from "../../RecommendedCreators";

type Creator = {
  handle: string;
  name: string;
  image: string | null;
  verified: boolean;
  bio?: string | null;
  website?: string | null;
  x?: string | null;
  github?: string | null;
};
type Data = {
  creator: Creator;
  prompts: React.ComponentProps<typeof PromptCard>[];
  pinned?: React.ComponentProps<typeof PromptCard>[];
  collections: { id: string; name: string; count: number }[];
};

function VerifiedBadge() {
  return (
    <span title="Verified creator" className="inline-flex items-center text-blue-500">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    </span>
  );
}

export function CreatorClient({ handle }: { handle: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/u/${handle}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => router.push("/browse"))
      .finally(() => setLoading(false));
  }, [handle, router]);

  const totalStars = data?.prompts.reduce((s, p) => s + (p.stars || 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ) : data ? (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 mb-8">
              <div className="flex items-center gap-6">
                <Avatar name={data.creator.name} image={data.creator.image} size={96} />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{data.creator.name}</h1>
                    {data.creator.verified && <VerifiedBadge />}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-mono">@{data.creator.handle}</p>
                  <div className="flex items-center gap-6 mt-3">
                    <div><span className="text-2xl font-bold text-gray-900 dark:text-white">{data.prompts.length}</span> <span className="text-sm text-gray-600 dark:text-gray-400">prompts</span></div>
                    <div><span className="text-2xl font-bold text-gray-900 dark:text-white">{totalStars}</span> <span className="text-sm text-gray-600 dark:text-gray-400">stars</span></div>
                  </div>
                  {data.creator.bio && (
                    <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 max-w-xl">{data.creator.bio}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                    {data.creator.website && (
                      <a href={data.creator.website} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Website</a>
                    )}
                    {data.creator.x && (
                      <a href={`https://x.com/${data.creator.x.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">@{data.creator.x.replace(/^@/, "")} on X</a>
                    )}
                    {data.creator.github && (
                      <a href={`https://github.com/${data.creator.github}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">GitHub</a>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <FollowButton handle={data.creator.handle} />
                    <Link
                      href={`/u/${data.creator.handle}/followers`}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      Followers
                    </Link>
                    <a
                      href={`/u/${data.creator.handle}/feed.xml`}
                      target="_blank"
                      rel="noreferrer"
                      title="RSS feed of this creator's prompts"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6.18 15.64a2.18 2.18 0 012.18 2.18C8.36 19 7.38 20 6.18 20 5 20 4 19 4 17.82a2.18 2.18 0 012.18-2.18zM4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27zm0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93z" />
                      </svg>
                      RSS
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {data.pinned && data.pinned.length > 0 && (
              <div className="mb-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.828 1.172a.5.5 0 00-.707 0L7.05 3.243a2 2 0 01-1.137.566l-2.31.33a.5.5 0 00-.277.853l1.672 1.63a2 2 0 01.575 1.77l-.394 2.3a.5.5 0 00.726.527l2.066-1.086a2 2 0 011.86 0l2.066 1.086a.5.5 0 00.725-.527l-.394-2.3a2 2 0 01.575-1.77l1.672-1.63a.5.5 0 00-.277-.853l-2.31-.33a2 2 0 01-1.137-.566L9.828 1.172z" /></svg>
                  Pinned
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.pinned.map((p) => (
                    <PromptCard key={p.id} {...p} />
                  ))}
                </div>
              </div>
            )}

            {data.collections.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Collections</h2>
                <div className="flex flex-wrap gap-3">
                  {data.collections.map((c) => (
                    <Link key={c.id} href={`/collections/${c.id}`} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{c.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.prompts.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">No public prompts yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.prompts.map((p) => (
                  <PromptCard key={p.id} {...p} />
                ))}
              </div>
            )}

            <RecommendedCreators exclude={data.creator.handle} />
          </>
        ) : null}
      </main>
    </div>
  );
}
