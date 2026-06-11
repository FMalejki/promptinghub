import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "../components/Navbar";
import { listTemplates } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Prompt templates",
  description: "Start from a curated, battle-tested prompt template and make it your own.",
};

export default function TemplatesPage() {
  const templates = listTemplates();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Prompt templates</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Pick a proven starting point, fill in the{" "}
            <code className="font-mono text-sm">{"{{placeholders}}"}</code>, and publish. You can edit everything before it goes live.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/new?template=${t.id}`}
              className="group flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl" aria-hidden>{t.emoji}</span>
                <h2 className="font-semibold text-gray-900 dark:text-white">{t.title}</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">{t.blurb}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{t.category}</span>
                {t.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">#{tag}</span>
                ))}
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                Use template
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
