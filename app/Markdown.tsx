"use client";
import React from "react";
import { parseBlocks, parseInline, type InlineSegment } from "@/lib/markdown";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((seg: InlineSegment, i) => {
        if (seg.type === "bold") return <strong key={i}>{seg.text}</strong>;
        if (seg.type === "italic") return <em key={i}>{seg.text}</em>;
        if (seg.type === "code")
          return (
            <code key={i} className="px-1 py-0.5 text-sm font-mono bg-gray-100 dark:bg-gray-800 rounded">
              {seg.text}
            </code>
          );
        if (seg.type === "link")
          return (
            <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-600 dark:text-blue-400 hover:underline">
              {seg.text}
            </a>
          );
        return <React.Fragment key={i}>{seg.text}</React.Fragment>;
      })}
    </>
  );
}

const HEADING_CLASS: Record<number, string> = {
  1: "text-2xl font-bold mt-2 mb-3",
  2: "text-xl font-semibold mt-5 mb-2",
  3: "text-lg font-semibold mt-4 mb-2",
};

export function Markdown({ src }: { src: string }) {
  const blocks = parseBlocks(src);
  return (
    <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          const cls = `${HEADING_CLASS[b.level] || HEADING_CLASS[3]} text-gray-900 dark:text-white`;
          if (b.level === 1) return <h1 key={i} className={cls}><Inline text={b.text} /></h1>;
          if (b.level === 2) return <h2 key={i} className={cls}><Inline text={b.text} /></h2>;
          return <h3 key={i} className={cls}><Inline text={b.text} /></h3>;
        }
        if (b.type === "code")
          return (
            <pre key={i} className="my-3 p-4 rounded-lg bg-gray-900 dark:bg-black overflow-x-auto">
              <code className="text-sm font-mono text-gray-100">{b.text}</code>
            </pre>
          );
        if (b.type === "list")
          return (
            <ul key={i} className="my-3 ml-5 list-disc space-y-1">
              {b.items.map((it, j) => (
                <li key={j}><Inline text={it} /></li>
              ))}
            </ul>
          );
        return <p key={i} className="my-3"><Inline text={b.text} /></p>;
      })}
    </div>
  );
}
