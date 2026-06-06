"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "../../Avatar";

type Detail = {
  id: string;
  name: string;
  description: string;
  category: string;
  body: string;
  author: { email: string; name: string; image: string | null };
};

export default function PromptDetailPage({ params }: { params: { id: string } }) {
  const [prompt, setPrompt] = useState<Detail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/prompts/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setPrompt(d);
        setStatus("ready");
      })
      .catch(() => setStatus("notfound"));
  }, [params.id]);

  async function copy() {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
        {status === "ready" && prompt && (
          <article>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-lg font-semibold text-gray-900">{prompt.name}</h1>
              <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 shrink-0 mt-1">{prompt.category}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{prompt.description}</p>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
              <Avatar name={prompt.author.name} image={prompt.author.image} size={20} />
              <span>{prompt.author.name}</span>
            </div>

            <div className="mt-6 border border-gray-200 rounded bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
                <span className="text-xs text-gray-500">Prompt</span>
                <button onClick={copy} className="text-xs bg-gray-800 hover:bg-gray-900 text-white rounded px-3 py-1">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap break-words font-mono">{prompt.body}</pre>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
