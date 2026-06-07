"use client";
import { useState } from "react";
import { buildShareLinks } from "@/lib/share";

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const links = buildShareLinks(url, title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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
      <button onClick={copyLink} className={btn}>{copied ? "Copied!" : "Copy link"}</button>
    </div>
  );
}
