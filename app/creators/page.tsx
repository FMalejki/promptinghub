import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { topCreators, type TopCreator } from "@/lib/users";
import { nextOffset } from "@/lib/pagination";
import { Navbar } from "../components/Navbar";
import { CreatorsList } from "./CreatorsList";

export const metadata: Metadata = {
  title: "Top creators",
  description: "The most followed and starred prompt creators on PromptingHub.",
};

export const revalidate = 300;

const PAGE_SIZE = 24;

export default async function CreatorsPage() {
  let creators: TopCreator[] = [];
  try {
    creators = await topCreators(await getDb(), PAGE_SIZE, 0);
  } catch {
    // DB unavailable — render the empty state.
  }
  const initialNextOffset = nextOffset(creators.length, PAGE_SIZE, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">🏆 Top creators</h1>
          <p className="text-gray-600 dark:text-gray-400">Ranked by followers, stars and prompts</p>
        </div>

        {creators.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No creators yet.</div>
        ) : (
          <CreatorsList initial={creators} initialNextOffset={initialNextOffset} pageSize={PAGE_SIZE} />
        )}
      </main>
    </div>
  );
}
