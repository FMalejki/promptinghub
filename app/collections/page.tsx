import type { Metadata } from "next";
import Link from "next/link";
import { CoverImage } from "../components/CoverImage";
import { getDb } from "@/lib/db";
import { listPublicCollections, type PublicCollection } from "@/lib/collections";
import { collectionsItemListJsonLd, jsonLdHtml } from "@/lib/jsonLd";
import { Navbar } from "../components/Navbar";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated collections of AI prompts on PromptingHub.",
};

export const revalidate = 300;

export default async function CollectionsPage() {
  let collections: PublicCollection[] = [];
  try {
    collections = await listPublicCollections(await getDb(), 60);
  } catch {
    // DB unavailable — render the empty state.
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {collections.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(collectionsItemListJsonLd(collections, SITE_URL)) }}
        />
      )}
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">Collections</h1>
          <p className="text-gray-600 dark:text-gray-400">Curated bundles of prompts worth keeping together</p>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No collections yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {collections.map((c) => (
              <Link
                key={c.id}
                href={`/collections/${c.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all overflow-hidden"
              >
                {c.cover && (
                  <CoverImage src={c.cover} seed={c.id} className="w-full h-32 object-cover" />
                )}
                <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{c.name}</h2>
                  <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-full">
                    {c.promptCount} {c.promptCount === 1 ? "prompt" : "prompts"}
                  </span>
                </div>
                {c.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{c.description}</p>}
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  by {c.owner.handle ? `@${c.owner.handle}` : c.owner.name}
                </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
