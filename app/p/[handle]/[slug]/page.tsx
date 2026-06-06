"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PromptView, PromptViewData } from "../../../PromptView";

export default function NamespacedPromptPage({ params }: { params: { handle: string; slug: string } }) {
  const [prompt, setPrompt] = useState<PromptViewData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    fetch(`/api/p/${params.handle}/${params.slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setPrompt(d);
        setStatus("ready");
      })
      .catch(() => setStatus("notfound"));
  }, [params.handle, params.slug]);

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/browse" className="text-sm font-medium text-gray-800 hover:underline">← PromptingHub</Link>
        </div>
      </header>
      <section className="max-w-3xl mx-auto px-4 py-8">
        {status === "loading" && <p className="text-sm text-gray-400">Loading…</p>}
        {status === "notfound" && (
          <div className="text-sm text-gray-500">
            Prompt not found. <Link href="/browse" className="text-gray-800 hover:underline">Back to browse</Link>
          </div>
        )}
        {status === "ready" && prompt && <PromptView prompt={prompt} />}
      </section>
    </main>
  );
}
