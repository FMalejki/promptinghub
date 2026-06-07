"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nextIndex } from "@/lib/palette";

type Result = { id: string; name: string; category: string };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [sel, setSel] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else {
      setQ("");
      setResults([]);
      setSel(-1);
    }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setSel(-1);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/prompts?q=${encodeURIComponent(term)}`)
        .then((r) => (r.ok ? r.json() : { prompts: [] }))
        .then((d) => {
          setResults((d.prompts || []).slice(0, 8));
          setSel((d.prompts || []).length ? 0 : -1);
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  function go(r: Result) {
    setOpen(false);
    router.push(`/prompt/${r.id}`);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => nextIndex(s, results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => nextIndex(s, results.length, -1));
    } else if (e.key === "Enter" && sel >= 0 && results[sel]) {
      go(results[sel]);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/40" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Search prompts…"
          className="w-full px-4 py-3 text-base bg-transparent text-gray-900 dark:text-white outline-none border-b border-gray-200 dark:border-gray-700"
        />
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-1">
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(r)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm ${
                    i === sel ? "bg-blue-50 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <span className="text-gray-900 dark:text-white truncate">{r.name}</span>
                  <span className="ml-3 shrink-0 text-xs text-gray-400">{r.category}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {q.trim().length >= 2 && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No matches.</div>
        )}
        <div className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
