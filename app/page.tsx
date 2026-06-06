"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";

type Author = { email: string; name: string; image: string | null };
type Prompt = { id: string; name: string; description: string; category: string; author: Author };

export default function LandingPage() {
  const [featured, setFeatured] = useState<Prompt[]>([]);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => (r.ok ? r.json() : { prompts: [] }))
      .then((b) => setFeatured((b.prompts || []).slice(0, 6)));
  }, []);

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">PromptingHub</span>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Link href="/browse" className="hover:text-gray-800">Browse</Link>
            <Link href="/login" className="text-gray-800 hover:underline">Sign in</Link>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
          Share, customize, and install AI prompts.
        </h1>
        <p className="mt-3 text-gray-600 max-w-xl mx-auto">
          PromptingHub is the home for great prompts — multi-file packages you can tweak with
          fill-in-the-blank variables and pull in by <code className="text-gray-800">owner/slug</code>.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/browse" className="bg-gray-900 hover:bg-black text-white text-sm rounded px-5 py-2.5">Browse prompts</Link>
          <Link href="/register" className="border border-gray-300 hover:border-gray-500 text-gray-800 text-sm rounded px-5 py-2.5">Add your own</Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { t: "Multi-file packages", d: "A prompt isn't just one box of text — bundle .md, .py, .yaml and more. Drag-and-drop a whole codebase." },
          { t: "Customizable templates", d: "Mark {{variables}} and anyone can fill them in with live preview before copying." },
          { t: "Install by handle", d: "Every prompt gets a stable owner/slug address — copy, share, and pull it in." },
        ].map((c) => (
          <div key={c.t} className="border border-gray-200 rounded bg-white p-4">
            <div className="text-sm font-medium text-gray-900">{c.t}</div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{c.d}</p>
          </div>
        ))}
      </section>

      {featured.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 pb-20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-800">Featured prompts</h2>
            <Link href="/browse" className="text-xs text-gray-500 hover:text-gray-800">View all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featured.map((p) => (
              <Link key={p.id} href={`/prompt/${p.id}`} className="border border-gray-200 rounded bg-white p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium text-gray-900">{p.name}</div>
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 shrink-0 mt-0.5">{p.category}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                  <Avatar name={p.author.name} image={p.author.image} size={16} />
                  <span>{p.author.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6 text-xs text-gray-400 flex items-center justify-between">
          <span>PromptingHub</span>
          <Link href="/browse" className="hover:text-gray-700">Browse all prompts</Link>
        </div>
      </footer>
    </main>
  );
}
