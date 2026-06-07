"use client";
import { useState } from "react";
import { buildShareLinks } from "@/lib/share";
import { COPY_FEEDBACK_MS, copyLabel } from "@/lib/clipboard";

export function ShareButtons({ title, promptId }: { title: string; promptId?: string }) {
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const links = buildShareLinks(url, title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function copyEmbed() {
    if (!promptId || typeof window === "undefined") return;
    const origin = window.location.origin;
    const snippet = `<iframe src="${origin}/embed/${promptId}" width="600" height="400" style="border:1px solid #e5e7eb;border-radius:12px;max-width:100%;" title="${title.replace(/"/g, "&quot;")}" frameborder="0" loading="lazy"></iframe>`;
    try {
      await navigator.clipboard.writeText(snippet);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), COPY_FEEDBACK_MS);
    } catch {
      /* clipboard unavailable */
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors";

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Share:</span>
      <a href={links.x} target="_blank" rel="noreferrer" className={btn}>X</a>
      <a href={links.linkedin} target="_blank" rel="noreferrer" className={btn}>LinkedIn</a>
      <a href={links.reddit} target="_blank" rel="noreferrer" className={btn}>Reddit</a>
      <button onClick={copyLink} className={btn}>{copyLabel(copied, "Copy link")}</button>
      {promptId && (
        <button onClick={copyEmbed} className={btn} title="Copy an iframe to embed this prompt">
          {copyLabel(embedCopied, "Embed", "Embed copied!")}
        </button>
      )}
    </div>
  );
}
