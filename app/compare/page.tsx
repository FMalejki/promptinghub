"use client";
import { useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import { diffLines, diffStats } from "@/lib/diff";
import { promptToText } from "@/lib/promptText";

type PromptLite = { id: string; name: string; body?: string; files?: { path: string; content: string }[] | null };

function idFromInput(s: string): string {
  const m = s.trim().match(/[a-f0-9]{24}/i);
  return m ? m[0] : s.trim();
}

export default function ComparePage() {
  const [aIn, setAIn] = useState("");
  const [bIn, setBIn] = useState("");
  const [a, setA] = useState<PromptLite | null>(null);
  const [b, setB] = useState<PromptLite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Seed from ?a=&b= and auto-compare.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const qa = sp.get("a") || "";
    const qb = sp.get("b") || "";
    if (qa) setAIn(qa);
    if (qb) setBIn(qb);
    if (qa && qb) void run(qa, qb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPrompt(id: string): Promise<PromptLite | null> {
    const res = await fetch(`/api/prompts/${idFromInput(id)}`);
    if (!res.ok) return null;
    return res.json();
  }

  async function run(ra = aIn, rb = bIn) {
    if (!ra.trim() || !rb.trim()) return;
    setLoading(true);
    setError(null);
    const [pa, pb] = await Promise.all([fetchPrompt(ra), fetchPrompt(rb)]);
    setLoading(false);
    if (!pa || !pb) {
      setError("Couldn't load one of the prompts. Paste a valid prompt URL or id.");
      setA(null);
      setB(null);
      return;
    }
    setA(pa);
    setB(pb);
  }

  const segs = a && b ? diffLines(promptToText(a), promptToText(b)) : [];
  const stats = a && b ? diffStats(promptToText(a), promptToText(b)) : null;

  const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Compare prompts</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Paste two prompt URLs or ids to see a line-by-line diff.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input className={inputCls} value={aIn} onChange={(e) => setAIn(e.target.value)} placeholder="Prompt A (url or id)" />
          <input className={inputCls} value={bIn} onChange={(e) => setBIn(e.target.value)} placeholder="Prompt B (url or id)" />
        </div>
        <button
          onClick={() => run()}
          disabled={loading || !aIn.trim() || !bIn.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg"
        >
          {loading ? "Comparing…" : "Compare"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {a && b && (
          <div className="mt-6">
            <div className="text-sm font-mono mb-2 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">{a.name}</span> → <span className="font-semibold">{b.name}</span>{" "}
              <span className="text-green-600 dark:text-green-400">+{stats?.added}</span>{" "}
              <span className="text-red-600 dark:text-red-400">−{stats?.removed}</span>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
              {segs.map((seg, i) => (
                <div
                  key={i}
                  className={
                    seg.type === "add"
                      ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3"
                      : seg.type === "del"
                      ? "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-3"
                      : "text-gray-600 dark:text-gray-400 px-3"
                  }
                >
                  <span className="select-none text-gray-400 mr-2">{seg.type === "add" ? "+" : seg.type === "del" ? "−" : " "}</span>
                  {seg.text || " "}
                </div>
              ))}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
