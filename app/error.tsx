"use client";
import { useEffect } from "react";
import Link from "next/link";

// Branded route-level error boundary (replaces Next's default error screen) for
// any uncaught render/runtime error within a page. `reset` re-renders the segment.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface to the console (and any attached logger) so we still see real errors.
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <svg className="w-16 h-16 mx-auto text-amber-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          An unexpected error occurred. You can try again, or head back home.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
