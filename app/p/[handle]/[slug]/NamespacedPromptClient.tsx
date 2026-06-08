"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "../../../components/Navbar";
import { PromptDetailView, PromptDetail } from "../../../PromptDetailView";

export function NamespacedPromptClient({ handle, slug }: { handle: string; slug: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/p/${handle}/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPrompt)
      .catch(() => router.push("/browse"))
      .finally(() => setLoading(false));
  }, [handle, slug, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      {loading ? (
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        </div>
      ) : (
        prompt && <PromptDetailView prompt={prompt} />
      )}
    </div>
  );
}
