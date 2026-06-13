"use client";
import { useMemo } from "react";
import { splitHighlight } from "@/lib/promptSearch";

// Renders plain text with case-insensitive matches of `query` wrapped in <mark>.
// Used in the prompt file viewer when an in-prompt search is active (it replaces
// the variable-highlighting PromptText for the duration of the search). Pure split
// logic lives in lib/promptSearch (unit-tested).
export function HighlightedText({ text, query }: { text: string; query: string }) {
  const segments = useMemo(() => splitHighlight(text, query), [text, query]);
  return (
    <>
      {segments.map((s, i) =>
        s.match ? (
          <mark key={i} className="rounded-sm bg-yellow-200 dark:bg-yellow-500/40 text-inherit">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}
