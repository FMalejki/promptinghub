import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCreatorProfile } from "@/lib/users";
import { listFollowers, type Follower } from "@/lib/follows";
import { Navbar } from "../../../components/Navbar";
import { Avatar } from "../../../Avatar";

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  return { title: `Followers of @${params.handle} · PromptingHub` };
}

export default async function FollowersPage({ params }: { params: { handle: string } }) {
  let followers: Follower[] = [];
  let name = params.handle;
  try {
    const db = await getDb();
    const creator = await getCreatorProfile(db, params.handle);
    if (!creator) notFound();
    name = creator.name || params.handle;
    followers = await listFollowers(db, params.handle);
  } catch {
    // DB unavailable — render the empty state.
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/u/${params.handle}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to @{params.handle}
        </Link>
        <h1 className="mt-3 mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          People following {name}
        </h1>

        {followers.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No followers yet.</div>
        ) : (
          <ul className="space-y-2">
            {followers.map((f, i) => {
              const inner = (
                <>
                  <Avatar name={f.name} image={f.image} size={40} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.name}</div>
                    {f.handle && <div className="text-xs text-gray-500 dark:text-gray-400">@{f.handle}</div>}
                  </div>
                </>
              );
              const cls =
                "flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl";
              return (
                <li key={f.handle ?? `${f.name}-${i}`}>
                  {f.handle ? (
                    <Link href={`/u/${f.handle}`} className={`${cls} hover:border-gray-300 dark:hover:border-gray-600 transition-colors`}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={cls}>{inner}</div>
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
