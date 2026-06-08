import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { topCategories } from "@/lib/prompts";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "Categories · PromptingHub",
  description: "Browse AI prompts by category on PromptingHub.",
};

export const revalidate = 300;

export default async function CategoriesPage() {
  let categories: { category: string; count: number }[] = [];
  try {
    categories = await topCategories(await getDb());
  } catch {
    // DB unavailable — render the empty state.
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Categories</h1>
          <p className="text-gray-600 dark:text-gray-400">Browse prompts by what they do</p>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No categories yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {categories.map((c) => (
              <Link
                key={c.category}
                href={`/c/${encodeURIComponent(c.category)}`}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
              >
                <span className="font-medium text-gray-900 dark:text-white">{c.category}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{c.count}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
