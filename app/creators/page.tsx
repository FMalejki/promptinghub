import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { topCreators, type TopCreator } from "@/lib/users";
import { Navbar } from "../components/Navbar";
import { Avatar } from "../Avatar";

export const metadata: Metadata = {
  title: "Top creators",
  description: "The most followed and starred prompt creators on PromptingHub.",
};

export const revalidate = 300;

export default async function CreatorsPage() {
  let creators: TopCreator[] = [];
  try {
    creators = await topCreators(await getDb(), 50);
  } catch {
    // DB unavailable — render the empty state.
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">🏆 Top creators</h1>
          <p className="text-gray-600 dark:text-gray-400">Ranked by followers, stars and prompts</p>
        </div>

        {creators.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No creators yet.</div>
        ) : (
          <ol className="space-y-2">
            {creators.map((c, i) => (
              <li key={c.handle}>
                <Link
                  href={`/u/${c.handle}`}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <span className="w-6 text-center font-bold text-gray-400">{i + 1}</span>
                  <Avatar name={c.name} image={c.image} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</span>
                      {c.verified && (
                        <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Verified">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">@{c.handle}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-5 text-sm text-gray-600 dark:text-gray-400">
                    <span><b className="text-gray-900 dark:text-white">{c.followers}</b> followers</span>
                    <span><b className="text-gray-900 dark:text-white">{c.stars}</b> stars</span>
                    <span><b className="text-gray-900 dark:text-white">{c.prompts}</b> prompts</span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
