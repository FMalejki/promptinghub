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
        if (b.type === "list") {
          const items = b.items.map((it, j) => <li key={j}><Inline text={it} /></li>);
          return b.ordered ? (
            <ol key={i} className="my-3 ml-5 list-decimal space-y-1">{items}</ol>
          ) : (
            <ul key={i} className="my-3 ml-5 list-disc space-y-1">{items}</ul>
          );
        }
        if (b.type === "quote")
          return (
            <blockquote key={i} className="my-3 border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400">
              <Inline text={b.text} />
            </blockquote>
          );
        if (b.type === "table") {
          const alignClass = (a: (typeof b.align)[number]) =>
            a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";
          return (
            <div key={i} className="my-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                    {b.header.map((h, c) => (
                      <th key={c} className={`px-3 py-2 font-semibold text-gray-900 dark:text-white ${alignClass(b.align[c])}`}>
                        <Inline text={h} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={r} className="border-b border-gray-200 dark:border-gray-700">
                      {row.map((cell, c) => (
                        <td key={c} className={`px-3 py-2 align-top ${alignClass(b.align[c])}`}>
                          <Inline text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.type === "hr") return <hr key={i} className="my-5 border-gray-200 dark:border-gray-700" />;
        if (b.type === "image")
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={i} src={b.src} alt={b.alt} className="my-3 max-w-full rounded-lg border border-gray-200 dark:border-gray-700" loading="lazy" />;
        return <p key={i} className="my-3"><Inline text={b.text} /></p>;
      })}
    </div>
  );
}
